import { Members } from '/imports/common/collections/members';
import { StorageUnits, StorageRequests } from '/imports/common/collections/storage';
import {
  desiredStorageRequestStatus,
  hasActiveLabMembershipAt,
  storageExemptionDeactivationReason,
  EDITABLE_STORAGE_REQUEST_STATUSES,
  isEditableStorageRequest,
} from '/imports/common/lib/storageRules';
import { appendStorageEvent } from './events';
import { runStorageAtomic } from './atomic';

const systemActor = '__system__';

const updateWithEvent = async ({ collection, selector, modifier, event }) => runStorageAtomic({
  transactional: async (session) => {
    const result = await collection.rawCollection().updateOne(selector, modifier, { session });
    if (result.matchedCount !== 1) return false;
    await appendStorageEvent(event, { session });
    return true;
  },
});

const reconcileRequest = async (request, owner, now) => {
  if (!isEditableStorageRequest(request)) return false;
  const wanted = desiredStorageRequestStatus(request.request_type, hasActiveLabMembershipAt(owner, now));
  if (wanted === request.request_status) return false;
  const changed = await updateWithEvent({
    collection: StorageRequests,
    selector: { _id: request._id, request_status: request.request_status, updatedAt: request.updatedAt },
    modifier: { $set: { request_status: wanted, updatedAt: now } },
    event: {
      entityType: 'storageRequest', entityId: request._id,
      eventType: wanted === 'waiting' ? 'request_eligibility_resumed' : 'request_eligibility_paused',
      actorType: 'system', actor: systemActor, member: request.owner, occurredAt: now,
      details: { previous_status: request.request_status },
    },
  });
  if (!changed) return false;
  return true;
};

const reconcileUnit = async (unit, owner, now) => {
  let warningsChanged = 0;
  let exemptionsChanged = 0;
  if (unit.warning && hasActiveLabMembershipAt(owner, now)) {
    const warning = unit.warning;
    const changed = await updateWithEvent({
      collection: StorageUnits,
      selector: { _id: unit._id, 'warning.id': warning.id, updatedAt: unit.updatedAt },
      modifier: { $unset: { warning: '' }, $set: { updatedAt: now } },
      event: {
        entityType: 'storageUnit', entityId: unit._id, eventType: 'warning_resolved_renewal',
        actorType: 'system', actor: systemActor, member: unit.owner, unit: unit._id,
        occurredAt: now, details: { warning_id: warning.id },
      },
    });
    if (changed) {
      warningsChanged = 1;
      unit = { ...unit, updatedAt: now };
      delete unit.warning;
    }
  }
  const reason = storageExemptionDeactivationReason(unit.exemption, now);
  if (reason) {
    const changed = await updateWithEvent({
      collection: StorageUnits,
      selector: {
        _id: unit._id,
        'exemption.created_at': unit.exemption.created_at,
        updatedAt: unit.updatedAt,
      },
      modifier: { $unset: { exemption: '' }, $set: { updatedAt: now } },
      event: {
        entityType: 'storageUnit', entityId: unit._id, eventType: `exemption_${reason}`,
        actorType: 'system', actor: systemActor, member: unit.owner, unit: unit._id,
        occurredAt: now,
      },
    });
    if (changed) {
      exemptionsChanged = 1;
    }
  }
  return { warningsChanged, exemptionsChanged };
};

/** Lazy, idempotent housekeeping. It never sends member communication. */
export const reconcileStorageState = async ({ ownerIds, now = new Date() } = {}) => {
  const ownerSelector = ownerIds?.length ? { owner: { $in: [...new Set(ownerIds)] } } : {};
  const [requests, units] = await Promise.all([
    StorageRequests.find({
      ...ownerSelector, request_status: { $in: EDITABLE_STORAGE_REQUEST_STATUSES },
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
