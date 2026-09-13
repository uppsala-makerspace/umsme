import { Members } from '/imports/common/collections/members';
import { StorageUnits, StorageRequests } from '/imports/common/collections/storage';
import {
  desiredStorageRequestStatus,
  hasActiveLabMembershipAt,
  storageExemptionDeactivationReason,
} from '/imports/common/lib/storageRules';
import { appendStorageEvent } from './events';

const systemActor = '__system__';

const updateOne = async (collection, selector, modifier) => collection.updateAsync(selector, modifier);

const reconcileRequest = async (request, owner, now) => {
  if (!['waiting', 'paused_ineligible'].includes(request.request_status)) return false;
  const wanted = desiredStorageRequestStatus(request.request_type, hasActiveLabMembershipAt(owner, now));
  if (wanted === request.request_status) return false;
  const changed = await updateOne(StorageRequests,
    { _id: request._id, request_status: request.request_status, updatedAt: request.updatedAt },
    { $set: { request_status: wanted, updatedAt: now } });
  if (!changed) return false;
  await appendStorageEvent({
    entityType: 'storageRequest', entityId: request._id,
    eventType: wanted === 'waiting' ? 'request_eligibility_resumed' : 'request_eligibility_paused',
    actorType: 'system', actor: systemActor, member: request.owner, occurredAt: now,
    details: { previous_status: request.request_status },
  });
  return true;
};

const reconcileUnit = async (unit, owner, now) => {
  let warningsChanged = 0;
  let exemptionsChanged = 0;
  if (unit.warning && hasActiveLabMembershipAt(owner, now)) {
    const warning = unit.warning;
    const changed = await updateOne(StorageUnits,
      { _id: unit._id, 'warning.id': warning.id, updatedAt: unit.updatedAt },
      { $unset: { warning: '' }, $set: { updatedAt: now } });
    if (changed) {
      warningsChanged = 1;
      await appendStorageEvent({
        entityType: 'storageUnit', entityId: unit._id, eventType: 'warning_resolved_renewal',
        actorType: 'system', actor: systemActor, member: unit.owner, unit: unit._id,
        occurredAt: now, details: { warning_id: warning.id },
      });
      unit = { ...unit, updatedAt: now };
      delete unit.warning;
    }
  }
  const reason = storageExemptionDeactivationReason(unit.exemption, now);
  if (reason) {
    const changed = await updateOne(StorageUnits,
      { _id: unit._id, 'exemption.created_at': unit.exemption.created_at, updatedAt: unit.updatedAt },
      { $unset: { exemption: '' }, $set: { updatedAt: now } });
    if (changed) {
      exemptionsChanged = 1;
      await appendStorageEvent({
        entityType: 'storageUnit', entityId: unit._id, eventType: `exemption_${reason}`,
        actorType: 'system', actor: systemActor, member: unit.owner, unit: unit._id,
        occurredAt: now,
      });
    }
  }
  return { warningsChanged, exemptionsChanged };
};

/** Lazy, idempotent housekeeping. It never sends member communication. */
export const reconcileStorageState = async ({ ownerIds, now = new Date() } = {}) => {
  const ownerSelector = ownerIds?.length ? { owner: { $in: [...new Set(ownerIds)] } } : {};
  const [requests, units] = await Promise.all([
    StorageRequests.find({
      ...ownerSelector, request_status: { $in: ['waiting', 'paused_ineligible'] },
    }).fetchAsync(),
    StorageUnits.find({
      ...ownerSelector, availability_status: 'occupied',
      $or: [{ warning: { $exists: true } }, { exemption: { $exists: true } }],
    }).fetchAsync(),
  ]);
  const ids = [...new Set([...requests.map((item) => item.owner), ...units.map((item) => item.owner)].filter(Boolean))];
  const owners = await Members.find({ _id: { $in: ids } }).fetchAsync();
  const ownerById = new Map(owners.map((owner) => [owner._id, owner]));
  let requestsChanged = 0;
  let warningsChanged = 0;
  let exemptionsChanged = 0;
  for (const request of requests) {
    if (await reconcileRequest(request, ownerById.get(request.owner), now)) requestsChanged += 1;
  }
  for (const unit of units) {
    const result = await reconcileUnit(unit, ownerById.get(unit.owner), now);
    warningsChanged += result.warningsChanged;
    exemptionsChanged += result.exemptionsChanged;
  }
  return { requestsChanged, warningsChanged, exemptionsChanged };
};
