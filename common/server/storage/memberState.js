import {
  StorageUnits,
  StorageRequests,
  StorageAssignments,
  StorageWarnings,
  StorageMoves,
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
  const assignment = await StorageAssignments.findOneAsync({ owner: owner._id, ended_at: { $exists: false } });
  const move = await StorageMoves.findOneAsync({ owner: owner._id, move_status: 'pending' });
  const warning = assignment
    ? await StorageWarnings.findOneAsync({ assignment: assignment._id, warning_status: 'open' })
    : null;
  const [unit, moveDestination] = await Promise.all([
    assignment ? StorageUnits.findOneAsync(assignment.unit) : null,
    move ? StorageUnits.findOneAsync(move.to_unit) : null,
  ]);
  const awaitingClearanceUnit = assignment ? null : await StorageUnits.findOneAsync({
    owner: owner._id, availability_status: 'awaiting_clearance',
  });
  return {
    member: member._id,
    owner: owner._id,
    family_read_only: familyDependent,
    has_active_lab_membership: hasActiveLabMembershipAt(owner, now),
    request,
    assignment: assignment ? {
      _id: assignment._id,
      assigned_at: assignment.assigned_at,
      unit: publicUnit(unit),
    } : null,
    awaiting_clearance: publicUnit(awaitingClearanceUnit),
    move: move ? {
      _id: move._id,
      deadline_at: move.deadline_at,
      requires_inspection: move.requires_inspection,
      destination: publicUnit(moveDestination),
    } : null,
    warning: warning ? {
      _id: warning._id,
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
