import { StorageWalls, StorageUnits } from '/imports/common/collections/storage';
import { storageHeightForRow } from '/imports/common/lib/storageRules';

/**
 * Storage walls with consecutively numbered positions. Each wall takes
 * column_count * row_count positions, starting where the previous one ended,
 * so that a unit can be placed by its position alone.
 *
 * @param {Array<{ _id: string, name: string, floor: 'floor1'|'floor2',
 *                 column_count: number, row_count: number }>} definitions
 * @returns {Promise<Array<object>>} the walls with their first and last position
 */
export const makeStorageWalls = async (definitions, { now = new Date() } = {}) => {
  const walls = [];
  let start = 1;
  for (const [index, definition] of definitions.entries()) {
    const wall = { display_order: index + 1, active: true, createdAt: now, updatedAt: now, ...definition };
    await StorageWalls.insertAsync(wall);
    const end = start + wall.column_count * wall.row_count - 1;
    walls.push({ ...wall, start, end });
    start = end + 1;
  }
  return walls;
};

/**
 * Where a numbered position sits on its wall. Positions run two columns at a
 * time, top to bottom, alternating left and right column.
 */
export const storageLocation = (walls, position) => {
  const wall = walls.find(({ start, end }) => position >= start && position <= end);
  if (!wall) throw new Error(`Storage position ${position} is on no wall`);
  const offset = position - wall.start;
  const sectionSize = wall.row_count * 2;
  const row = Math.floor((offset % sectionSize) / 2) + 1;
  return {
    wall_id: wall._id,
    floor: wall.floor,
    column: Math.floor(offset / sectionSize) * 2 + (offset % 2) + 1,
    row,
    height: storageHeightForRow(row, wall.row_count),
  };
};

/**
 * A storage unit at a numbered position.
 *
 * @param {Array<object>} walls from makeStorageWalls
 * @param {{ name: string, position: number,
 *           status?: 'available'|'occupied'|'reserved'|'awaiting_clearance'|'unavailable',
 *           owner?: string, assignedAt?: Date, fields?: object }} options
 * @returns {Promise<string>} the unit id
 */
export const makeStorageUnit = (walls, {
  name, position, status = 'available', owner, assignedAt, fields = {}, now = new Date(),
}) => StorageUnits.insertAsync({
  name,
  ...storageLocation(walls, position),
  availability_status: status,
  ...(owner ? { owner } : {}),
  ...(owner && status === 'occupied' ? { assigned_at: assignedAt || now, assigned_by: '__seed__' } : {}),
  createdAt: now,
  updatedAt: now,
  ...fields,
});
