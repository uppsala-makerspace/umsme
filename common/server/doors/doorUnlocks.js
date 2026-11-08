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

// --- One member's openings (the Activity tab of a member's page) -------------

export const ACTIVITY_TIME_ZONE = 'Europe/Stockholm';
export const ACTIVITY_MONTHS = 12;
const DAY_MS = 24 * 60 * 60 * 1000;

/** "YYYY-MM" of a date in the activity time zone. */
const monthKey = (date) => {
  const parts = new Intl.DateTimeFormat('sv-SE', { timeZone: ACTIVITY_TIME_ZONE, year: 'numeric', month: '2-digit' })
    .formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type).value;
  return `${get('year')}-${get('month')}`;
};

/** The last `count` months up to and including the one `now` is in, oldest first. */
export const lastMonths = (now = new Date(), count = ACTIVITY_MONTHS) => {
  const [year, month] = monthKey(now).split('-').map(Number);
  return Array.from({ length: count }, (_, i) => {
    const index = year * 12 + (month - 1) - (count - 1 - i);
    return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`;
  });
};

/**
 * Door openings of one member or several (a whole family): the latest one
 * (however old, with whose it was), and for the last twelve calendar months
 * (Swedish time) the openings and the visits per month, and the openings per
 * door. A visit is a day a person opened any door: at most one a day per
 * person, so two family members on the same day are two visits. Openings
 * without a member (a lock user the sync could not tie to anyone) are not
 * anyone's.
 *
 * @param {string|string[]} memberIds
 * @returns {Promise<{ lastUnlock: {timestamp, door, method, memberid}|null,
 *   total: { openings: number, visits: number },
 *   months: {month: string, openings: number, visits: number}[],
 *   days: {day: string, openings: number, visits: number}[],
 *   byDoor: {door: string, count: number}[] }>}  `days` only those with an
 *   opening, oldest first, for a month's chart; byDoor counts openings
 */
export const memberDoorActivity = async (memberIds, { now = new Date() } = {}) => {
  const ids = [].concat(memberIds);
  const lastUnlock = await DoorUnlocks.findOneAsync(
    { memberid: { $in: ids } },
    { sort: { timestamp: -1 }, fields: { _id: 0, timestamp: 1, door: 1, method: 1, memberid: 1 } },
  );

  const months = lastMonths(now);
  // A margin beyond twelve months, so the oldest month is whole; the month
  // keys decide what counts.
  const since = new Date(now.getTime() - 400 * DAY_MS);
  // One group per person, day and door: enough for openings (summed), visits
  // (distinct person and day) and doors.
  const groups = await DoorUnlocks.rawCollection().aggregate([
    { $match: { memberid: { $in: ids }, timestamp: { $gte: since, $lte: now } } },
    { $group: {
      _id: {
        day: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp', timezone: ACTIVITY_TIME_ZONE } },
        memberid: '$memberid',
        door: '$door',
      },
      count: { $sum: 1 },
    } },
  ]).toArray();

  const openings = Object.fromEntries(months.map((m) => [m, 0]));
  const visitDays = Object.fromEntries(months.map((m) => [m, new Set()]));
  const perDoor = {};
  const perDay = {};
  for (const { _id: { day, memberid, door }, count } of groups) {
    const month = day.slice(0, 7);
    if (!(month in openings)) continue;
    openings[month] += count;
    visitDays[month].add(`${memberid} ${day}`);
    perDoor[door] = (perDoor[door] || 0) + count;
    perDay[day] = perDay[day] || { openings: 0, people: new Set() };
    perDay[day].openings += count;
    perDay[day].people.add(memberid);
  }

  const perMonth = months.map((month) => ({ month, openings: openings[month], visits: visitDays[month].size }));
  return {
    lastUnlock: lastUnlock || null,
    total: {
      openings: perMonth.reduce((sum, m) => sum + m.openings, 0),
      visits: perMonth.reduce((sum, m) => sum + m.visits, 0),
    },
    months: perMonth,
    days: Object.keys(perDay).sort().map((day) => ({ day, openings: perDay[day].openings, visits: perDay[day].people.size })),
    byDoor: Object.entries(perDoor)
      .map(([door, count]) => ({ door, count }))
      .sort((a, b) => b.count - a.count || a.door.localeCompare(b.door)),
  };
};

/** The index memberDoorActivity reads by. Called at startup by admin and the app. */
export const ensureDoorUnlockIndexes = async () => {
  await DoorUnlocks.rawCollection().createIndex(
    { memberid: 1, timestamp: -1 },
    { name: 'doorunlocks_member_timestamp' },
  );
};
