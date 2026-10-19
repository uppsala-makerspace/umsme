/**
 * The e2e scenario: the personas and the fixtures the e2e tests rely on,
 * nothing more. See plan/test-strategy.md.
 *
 * Every persona gets a known login token (e2eLoginToken), so that tests can
 * start logged in.
 *
 * The storage fixtures are positional: tests look for units by name, 1001 to
 * 1006, and each storage lifecycle owns its own units.
 */
import { Accounts } from 'meteor/accounts-base';
import { StorageUnits, StorageRequests, StorageOffers } from '/imports/common/collections/storage';
import { daysFromNow } from '../dates';
import { makeStorageWalls, makeStorageUnit } from '../storage';
import { PERSONAS, E2E_PERSONAS, e2eLoginToken } from './personas';
import { makeLiabilityVersions, makePersonas } from './build';

export const buildE2e = async ({ people, now }) => {
  const days = (n) => daysFromNow(n, now);
  const liability = await makeLiabilityVersions(days);
  const { members, userIds } = await makePersonas([...PERSONAS, ...E2E_PERSONAS], { people, days, now, liability });
  for (const [key, userId] of Object.entries(userIds)) {
    await Accounts._insertLoginToken(userId, { token: e2eLoginToken(key), when: now });
  }

  // Storage last, so that the storage hooks see the members' final dates.
  const walls = await makeStorageWalls([
    { _id: 'storage-fixture-wall-1', name: 'Floor 1, Wall 1', floor: 'floor1', column_count: 8, row_count: 6 },
    { _id: 'storage-fixture-wall-2', name: 'Floor 1, Wall 2', floor: 'floor1', column_count: 4, row_count: 5 },
    { _id: 'storage-fixture-wall-3', name: 'Floor 2, Wall 1', floor: 'floor2', column_count: 4, row_count: 6 },
  ], { now });
  const unit = (position, status, owner, fields) => makeStorageUnit(walls, {
    name: String(1000 + position), position, status, owner: owner?._id, assignedAt: days(-30), fields, now,
  });

  // 1001: the family's shared unit, read-only to the family member.
  await unit(1, 'occupied', members.family);

  // 1002: an owner whose lab expired, warned with five days left.
  await unit(2, 'occupied', members.storageWarning, {
    warning: { id: 'storage-fixture-warning', warned_at: days(-23), warned_by: '__seed__', deadline_at: days(5) },
  });

  // 1003: reclaimed, waiting to be emptied.
  await unit(3, 'awaiting_clearance', members.storageClearance);

  // 1004 → 1005: a move offered and not yet confirmed.
  const moveSource = await unit(4, 'occupied', members.storageMove);
  const moveDestination = await unit(5, 'reserved', members.storageMove);
  const moveRequest = await StorageRequests.insertAsync({
    owner: members.storageMove._id, request_type: 'move', requested_at: days(-30),
    preference: { floor: 'floor1', height: 'low' }, request_status: 'in_progress',
    source_unit: moveSource, createdAt: now, updatedAt: now,
  });
  await StorageUnits.updateAsync(moveSource, { $set: { source_request: moveRequest } });
  await StorageOffers.insertAsync({
    owner: members.storageMove._id, request: moveRequest, from_unit: moveSource, to_unit: moveDestination,
    offered_at: now, offered_by: '__seed__', deadline_at: days(14), requires_inspection: false,
    createdAt: now, updatedAt: now,
  });

  // 1006 free, with a member waiting in the queue for it.
  await unit(6, 'available');
  await StorageRequests.insertAsync({
    owner: members.storageQueue._id, request_type: 'allocation', requested_at: days(-30),
    preference: { floor: 'floor1', height: 'low' }, request_status: 'waiting', createdAt: now, updatedAt: now,
  });

  // The rest of the three walls, a few of them out of use.
  for (let position = 7; position <= walls[walls.length - 1].end; position += 1) {
    await unit(position, position % 13 === 0 ? 'unavailable' : 'available');
  }
};

/** Lines printed after seeding. */
export const e2eLoginSummary = () => [
  `${PERSONAS.length + E2E_PERSONAS.length} personas, password "password123"; see common/server/seed/scenarios/personas.js`,
];
