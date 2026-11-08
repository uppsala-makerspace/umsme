import { Random } from 'meteor/random';
import { Unlocks } from '/imports/common/collections/unlocks';
import { DoorUnlocks } from '/imports/common/collections/doorunlocks';
import { Members } from '/imports/common/collections/members';

/**
 * Move the legacy lock log (`unlocks`: the outer door's Danalock openings,
 * by lock username) into `doorunlocks`, emptying `unlocks` as it goes.
 *
 * Every row becomes { timestamp, door: 'outerDoor', method: 'danalock' } with
 * the member whose email the lock username holds ("name@example.org:"),
 * matched regardless of case; without one it keeps `extid`
 * ("<lock user>-<email>"), as the nightly lock sync does. An opening already
 * in `doorunlocks` (same time, outer door: the sync copied it there, or an
 * earlier run did) is skipped, and so is a second legacy row for the same
 * time.
 *
 * Fast on years of openings: the members and the openings already there are
 * read once, the rows are inserted and removed a batch at a time. A run that
 * stops halfway leaves the rest in `unlocks`, and a new run goes on from there.
 *
 * @param {{ batchSize?: number }} options
 * @returns {Promise<{ scanned: number, withMember: number, withExtid: number, skipped: number }>}
 */
export const migrateUnlocks = async ({ batchSize = 1000 } = {}) => {
  const legacy = Unlocks.rawCollection();
  const target = DoorUnlocks.rawCollection();
  const result = { scanned: 0, withMember: 0, withExtid: 0, skipped: 0 };

  const memberByEmail = new Map();
  await Members.find({ email: { $exists: true } }, { fields: { email: 1 } }).forEachAsync((m) => {
    const email = String(m.email || '').trim().toLowerCase();
    if (email && !memberByEmail.has(email)) memberByEmail.set(email, m._id);
  });

  // The outer door's openings already there, over the legacy rows' span.
  const [oldest] = await legacy.find({}, { projection: { timestamp: 1 } }).sort({ timestamp: 1 }).limit(1).toArray();
  const [newest] = await legacy.find({}, { projection: { timestamp: 1 } }).sort({ timestamp: -1 }).limit(1).toArray();
  if (!oldest) return result;
  const present = new Set();
  await target
    .find({ door: 'outerDoor', timestamp: { $gte: oldest.timestamp, $lte: newest.timestamp } }, { projection: { timestamp: 1 } })
    .forEach((u) => { present.add(u.timestamp.getTime()); });

  // Each round takes the first rows left and removes them, so the next round
  // finds the next ones.
  for (;;) {
    const rows = await legacy.find({}).limit(batchSize).toArray();
    if (!rows.length) break;
    const docs = [];
    for (const row of rows) {
      result.scanned += 1;
      const timestamp = row.timestamp instanceof Date ? row.timestamp : new Date(row.timestamp);
      if (Number.isNaN(timestamp.getTime()) || present.has(timestamp.getTime())) {
        result.skipped += 1;
        continue;
      }
      present.add(timestamp.getTime());

      const username = row.username || '';
      const colon = username.lastIndexOf(':');
      const email = (colon === -1 ? username : username.substring(0, colon)).trim();
      const memberid = email ? memberByEmail.get(email.toLowerCase()) : undefined;
      const doc = { _id: Random.id(), timestamp, door: 'outerDoor', method: 'danalock' };
      if (memberid) {
        doc.memberid = memberid;
        result.withMember += 1;
      } else {
        // The schema's limit: inserted past Collection2, so kept here.
        doc.extid = `${row.user}-${email}`.slice(0, 100);
        result.withExtid += 1;
      }
      docs.push(doc);
    }
    if (docs.length) await target.insertMany(docs, { ordered: true });
    await legacy.deleteMany({ _id: { $in: rows.map((r) => r._id) } });
  }
  return result;
};
