import { Members } from '/imports/common/collections/members';
import {
  StorageRequests,
  StorageWarnings,
  StorageExemptions,
  StorageActionExecutions,
} from '/imports/common/collections/storage';
import {
  desiredStorageRequestStatus,
  hasActiveLabMembershipAt,
  storageExemptionDeactivationReason,
} from '/imports/common/lib/storageRules';
import { appendStorageEvent } from './events';
import { ensureStorageUpdate } from './effects';
import { journaledStorageOperation, storageOperationId } from './journal';

const systemActor = '__system__';
const reconcileCollections = {
  request: StorageRequests, warning: StorageWarnings, exemption: StorageExemptions,
};
const matchesDesired = (record, desired) => Object.entries(desired).every(([key, value]) => {
  const actual = record?.[key];
  return value instanceof Date ? actual instanceof Date && actual.getTime() === value.getTime() : actual === value;
});

const executeReconciliation = async (payload) => {
  const collection = reconcileCollections[payload.collection];
  const id = storageOperationId('reconciliation', payload.kind, payload.record._id, payload.record.updatedAt.toISOString());
  return journaledStorageOperation({
    id, actionType: 'reconciliation', kind: `reconciliation.${payload.kind}`,
    targetType: `storage${payload.collection}`, targetId: payload.record._id,
    actor: systemActor, payload, now: payload.now,
  }, async (journal) => {
    await journal.step('domain_updated', () => ensureStorageUpdate(
      collection, payload.record._id, payload.selector, payload.modifier,
      (current) => matchesDesired(current, payload.desired),
    ));
    await journal.step('event_inserted', () => appendStorageEvent({
      id: `${id}:event`, ...payload.event,
    }));
    return true;
  });
};

const resumeReconciliationOperations = async () => {
  const now = new Date();
  const unfinished = await StorageActionExecutions.find({
    action_type: 'reconciliation',
    $or: [
      { execution_status: 'failed' },
      { execution_status: 'processing', lease_expires_at: { $lte: now } },
    ],
  }).fetchAsync();
  for (const operation of unfinished) await executeReconciliation(operation.operation_payload);
};

const reconcileRequest = async (request, owner, now) => {
  if (!['waiting', 'paused_ineligible'].includes(request.request_status)) return false;
  const wanted = desiredStorageRequestStatus(
    request.request_type,
    hasActiveLabMembershipAt(owner, now),
  );
  if (wanted === request.request_status) return false;
  await executeReconciliation({
    kind: 'request_eligibility', collection: 'request', record: request, now,
    selector: { request_status: request.request_status, updatedAt: request.updatedAt },
    modifier: { $set: { request_status: wanted, updatedAt: now } },
    desired: { request_status: wanted, updatedAt: now },
    event: {
      entityType: 'storageRequest', entityId: request._id,
      eventType: wanted === 'waiting' ? 'request_eligibility_resumed' : 'request_eligibility_paused',
      actorType: 'system', actor: systemActor, occurredAt: now,
      details: { owner: request.owner, previous_status: request.request_status },
    },
  });
  return true;
};

const resolveRenewedWarning = async (warning, owner, now) => {
  if (warning.warning_status !== 'open' || !hasActiveLabMembershipAt(owner, now)) return false;
  const modifier = {
      $set: {
        warning_status: 'resolved_renewal',
        resolved_at: now,
        resolved_by: systemActor,
        updatedAt: now,
      },
    };
  await executeReconciliation({
    kind: 'warning_renewal', collection: 'warning', record: warning, now,
    selector: { warning_status: 'open', updatedAt: warning.updatedAt }, modifier,
    desired: { warning_status: 'resolved_renewal', resolved_at: now, updatedAt: now },
    event: {
      entityType: 'storageWarning', entityId: warning._id, eventType: 'warning_resolved_renewal',
      actorType: 'system', actor: systemActor, occurredAt: now,
      details: { owner: warning.owner, assignment: warning.assignment },
    },
  });
  return true;
};

const deactivateExemption = async (exemption, now) => {
  const reason = storageExemptionDeactivationReason(exemption, now);
  if (!reason || exemption.active === false) return false;
  await executeReconciliation({
    kind: `exemption_${reason}`, collection: 'exemption', record: exemption, now,
    selector: { active: true, updatedAt: exemption.updatedAt },
    modifier: { $set: { active: false, updatedAt: now } },
    desired: { active: false, updatedAt: now },
    event: {
      entityType: 'storageExemption', entityId: exemption._id, eventType: `exemption_${reason}`,
      actorType: 'system', actor: systemActor, occurredAt: now,
      details: { assignment: exemption.assignment },
    },
  });
  return true;
};

/** Lazy, idempotent housekeeping. It never sends member communication. */
export const reconcileStorageState = async ({ ownerIds, now = new Date() } = {}) => {
  await resumeReconciliationOperations();
  const ownerSelector = ownerIds?.length ? { owner: { $in: [...new Set(ownerIds)] } } : {};
  const ownerIdList = ownerIds?.length
    ? [...new Set(ownerIds)]
    : [...new Set([
      ...(await StorageRequests.find({}, { fields: { owner: 1 } }).fetchAsync()).map((r) => r.owner),
      ...(await StorageWarnings.find({ warning_status: 'open' }, { fields: { owner: 1 } }).fetchAsync()).map((w) => w.owner),
    ])];
  const owners = await Members.find({ _id: { $in: ownerIdList } }).fetchAsync();
  const ownerById = new Map(owners.map((owner) => [owner._id, owner]));
  const requests = await StorageRequests.find({
    ...ownerSelector,
    request_status: { $in: ['waiting', 'paused_ineligible'] },
  }).fetchAsync();
  const warnings = await StorageWarnings.find({ ...ownerSelector, warning_status: 'open' }).fetchAsync();
  const exemptions = await StorageExemptions.find({ active: true }).fetchAsync();

  let requestsChanged = 0;
  let warningsChanged = 0;
  let exemptionsChanged = 0;
  for (const request of requests) {
    if (await reconcileRequest(request, ownerById.get(request.owner), now)) requestsChanged += 1;
  }
  for (const warning of warnings) {
    if (await resolveRenewedWarning(warning, ownerById.get(warning.owner), now)) warningsChanged += 1;
  }
  for (const exemption of exemptions) {
    if (await deactivateExemption(exemption, now)) exemptionsChanged += 1;
  }
  return { requestsChanged, warningsChanged, exemptionsChanged };
};
