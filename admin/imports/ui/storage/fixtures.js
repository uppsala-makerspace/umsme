import { groupStorageWalls, storageQueueRows } from '/imports/storage/presentation';

/** A small storage room for the stories: two walls, a few units, a queue. */
const DAY = 24 * 3600 * 1000;
const now = Date.now();

export const storyWalls = [
  { _id: 'w1', name: 'Floor 1, Wall 1', floor: 'floor1', display_order: 1, column_count: 4, row_count: 3, active: true },
  { _id: 'w2', name: 'Floor 2, Wall 1', floor: 'floor2', display_order: 2, column_count: 2, row_count: 3, active: true },
];
export const storyMembers = [
  { _id: 'm1', name: 'Vera Varnad', mid: '112', email: 'vera@example.org', lab: new Date(now - 20 * DAY) },
  { _id: 'm2', name: 'Fredrik Familj', mid: '120', email: 'family@example.org', lab: new Date(now + 200 * DAY) },
  { _id: 'm3', name: 'Kim Kö', mid: '130', email: 'kim@example.org', lab: new Date(now + 300 * DAY) },
  { _id: 'm4', name: 'Rolf Rensning', mid: '131', email: 'rolf@example.org', lab: new Date(now - 90 * DAY) },
];
const unit = (name, wall, column, row, status, extra = {}) => ({
  _id: `u${name}`, name, wall_id: wall, column, row, height: row <= 1 ? 'high' : 'low', floor: wall === 'w1' ? 'floor1' : 'floor2', availability_status: status, ...extra,
});
export const storyUnits = [
  unit('1001', 'w1', 1, 1, 'occupied', { owner: 'm2', assigned_at: new Date(now - 300 * DAY) }),
  unit('1002', 'w1', 1, 2, 'occupied', { owner: 'm1', assigned_at: new Date(now - 200 * DAY), warning: { warned_at: new Date(now - 5 * DAY) } }),
  unit('1003', 'w1', 2, 1, 'awaiting_clearance', { owner: 'm4' }),
  unit('1004', 'w1', 2, 2, 'available'),
  unit('1005', 'w1', 3, 1, 'reserved'),
  unit('1006', 'w1', 4, 3, 'unavailable', { note: 'Broken hinge' }),
  unit('2001', 'w2', 1, 1, 'available'),
];
export const storyRequests = [
  { _id: 'r1', owner: 'm3', request_type: 'allocation', request_status: 'waiting', requested_at: new Date(now - 30 * DAY), preference: { floor: 'floor1', height: 'low' } },
];

const decorate = (units) => units.map((u) => {
  const owner = storyMembers.find((m) => m._id === u.owner);
  const overdue = u.availability_status === 'occupied' && owner && owner.lab < new Date();
  return { ...u, wall_name: storyWalls.find((w) => w._id === u.wall_id).name, _overdue: !!overdue, ownerName: owner?.name || '', tooltip: [u.name, overdue ? 'Overdue' : u.availability_status, owner?.name].filter(Boolean).join(' · ') };
});
export const storyGroupedWalls = groupStorageWalls(decorate(storyUnits), storyWalls);
export const storyQueueRows = storageQueueRows({ requests: storyRequests, members: storyMembers, units: storyUnits });
