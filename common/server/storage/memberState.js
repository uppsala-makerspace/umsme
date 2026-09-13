import {
  StorageUnits,
  StorageRequests,
  StorageOffers,
} from '/imports/common/collections/storage';
import { hasActiveLabMembershipAt } from '/imports/common/lib/storageRules';
import { reconcileStorageState } from './reconciliation';

const publicUnit = (unit) => unit ? {
  _id: unit._id,
  name: unit.name,
  floor: unit.floor,
  height: unit.height,
  availability_status: unit.availability_status,
} : null;

export const storageMemberState = async ({ member, owner, familyDependent }, now = new Date()) => {
  await reconcileStorageState({ ownerIds: [owner._id], now });
  const request = omitRequestInternals(await StorageRequests.findOneAsync({
    owner: owner._id,
    request_status: { $in: ['waiting', 'paused_ineligible', 'in_progress'] },
  }));
  const unit = await StorageUnits.findOneAsync({ owner: owner._id, availability_status: 'occupied' });
  const offer = await StorageOffers.findOneAsync({ owner: owner._id });
  const offerDestination = offer ? await StorageUnits.findOneAsync(offer.to_unit) : null;
  const warning = unit?.warning;
  const awaitingClearanceUnit = unit ? null : await StorageUnits.findOneAsync({
    owner: owner._id, availability_status: 'awaiting_clearance',
  });
  return {
    member: member._id,
    owner: owner._id,
    family_read_only: familyDependent,
    has_active_lab_membership: hasActiveLabMembershipAt(owner, now),
    request,
    unit: unit ? { ...publicUnit(unit), assigned_at: unit.assigned_at } : null,
    awaiting_clearance: publicUnit(awaitingClearanceUnit),
    offer: offer ? {
      _id: offer._id,
      deadline_at: offer.deadline_at,
      requires_inspection: offer.requires_inspection,
      destination: publicUnit(offerDestination),
    } : null,
    warning: warning ? {
      _id: warning.id,
      warned_at: warning.warned_at,
      deadline_at: warning.deadline_at,
    } : null,
  };
};

function findAllowedPreference(preference) {
  if (!preference) return undefined;
  const result = {};
  if (preference.floor) result.floor = preference.floor;
  if (preference.height) result.height = preference.height;
  return Object.keys(result).length ? result : undefined;
}

const requestFields = ['_id', 'request_type', 'requested_at', 'preference', 'request_status'];
function omitRequestInternals(request) {
  if (!request) return null;
  return Object.fromEntries(requestFields.filter((key) => request[key] !== undefined)
    .map((key) => [key, key === 'preference' ? findAllowedPreference(request[key]) : request[key]]));
}
