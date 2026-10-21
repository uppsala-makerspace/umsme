import { Meteor } from 'meteor/meteor';
import { DoorUnlocks } from '/imports/common/collections/doorunlocks';
import { Members } from '/imports/common/collections/members';

/**
 * The door openings for admin: pages of the list, searched, sorted and paged
 * on the server (there are years of them), and visits per member for the
 * door statistics.
 */

const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const DOOR_UNLOCK_SORTS = ['timestamp', 'door', 'method', 'memberid', 'extid'];

const searchSelector = async (search) => {
  const words = (search || '').trim().split(/\s+/).filter(Boolean).slice(0, 5);
  if (!words.length) return null;
  const parts = [];
  for (const word of words) {
    const pattern = new RegExp(escape(word), 'i');
    const named = await Members.find({ name: pattern }, { fields: { _id: 1 }, limit: 200 }).fetchAsync();
    parts.push({ $or: [{ door: pattern }, { method: pattern }, { extid: pattern }, { memberid: pattern }, { memberid: { $in: named.map((m) => m._id) } }] });
  }
  return { $and: parts };
};

/**
 * One page of the openings, newest first unless sorted otherwise; each row
 * with the member's name.
 *
 * @returns {Promise<{ rows: object[], total: number }>}
 */
export const doorUnlocksPage = async ({ search, sort, page = 0, pageSize = 50 }) => {
  if (sort && !DOOR_UNLOCK_SORTS.includes(sort.field)) throw new Meteor.Error('bad-sort', `Cannot sort by "${sort.field}"`);
  const size = Math.min(Math.max(1, pageSize), 200);
  const selector = (await searchSelector(search)) || {};
  const order = sort ? { [sort.field]: sort.direction === 'desc' ? -1 : 1, _id: 1 } : { timestamp: -1, _id: 1 };
  const [unlocks, total] = await Promise.all([
    DoorUnlocks.find(selector, { sort: order, skip: Math.max(0, page) * size, limit: size }).fetchAsync(),
    DoorUnlocks.find(selector).countAsync(),
  ]);
  const names = Object.fromEntries((await Members.find(
    { _id: { $in: unlocks.map((u) => u.memberid).filter(Boolean) } }, { fields: { name: 1 } },
  ).fetchAsync()).map((m) => [m._id, m.name]));
  return { rows: unlocks.map((u) => ({ ...u, memberName: u.memberid ? names[u.memberid] || null : null })), total };
};

/** How many opened the door how often: the buckets of the door statistics. */
export const visitBuckets = (visitsPerPerson) => {
  const counts = Object.values(visitsPerPerson);
  const within = (low, high) => counts.filter((n) => n >= low && n <= high).length;
  return {
    labels: ['1-5', '6-10', '11-20', '21-50', '50-?'],
    counts: [within(1, 5), within(6, 10), within(11, 20), within(21, 50), counts.filter((n) => n > 50).length],
  };
};

/** Visits per member over the last six months, from DoorUnlocks. */
export const recordedVisits = async (now = new Date()) => {
  const since = new Date(now);
  since.setMonth(since.getMonth() - 6);
  const perPerson = {};
  await DoorUnlocks.find({ timestamp: { $gte: since } }, { fields: { memberid: 1, extid: 1 } }).forEachAsync((u) => {
    const who = u.memberid || u.extid;
    if (who) perPerson[who] = (perPerson[who] || 0) + 1;
  });
  return perPerson;
};
