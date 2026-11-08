import assert from 'assert';
import { Unlocks } from '/imports/common/collections/unlocks';
import { DoorUnlocks } from '/imports/common/collections/doorunlocks';
import { Members } from '/imports/common/collections/members';
import { migrateUnlocks } from '/imports/common/server/doors/migrateUnlocks';

// The legacy rows are in 2098, so the openings they become can be told from
// everyone else's and removed afterwards.
const prefix = 'migratetest-';
const at = (minute) => new Date(Date.UTC(2098, 0, 1, 12, minute));
const in2098 = { timestamp: { $gte: new Date('2098-01-01T00:00:00Z'), $lt: new Date('2099-01-01T00:00:00Z') } };

describe('migrating the legacy unlocks', function () {
  before(async function () {
    await Unlocks.removeAsync({});
    await Members.insertAsync({ _id: `${prefix}m`, mid: 'MIG1', name: 'Migrate Test', email: `${prefix}member@example.org` });
    // Already copied by the lock sync.
    await DoorUnlocks.insertAsync({ timestamp: at(1), door: 'outerDoor', method: 'danalock', memberid: `${prefix}m` });
    const row = (minute, username, user = 'user-1') => Unlocks.insertAsync({ timestamp: at(minute), username, user });
    await row(1, `${prefix}member@example.org:`); // already there
    await row(2, `${prefix.toUpperCase()}Member@Example.org:`); // the member, another case
    await row(3, `${prefix}member@example.org:`);
    await row(3, `${prefix}member@example.org:`); // the same time again
    await row(4, `${prefix}stranger@example.org:`, 'user-9'); // no member
    await row(5, `${prefix}member@example.org`); // no colon
  });

  after(async function () {
    await Unlocks.removeAsync({});
    await DoorUnlocks.removeAsync(in2098);
    await Members.removeAsync({ _id: `${prefix}m` });
  });

  it('moves the rows in batches, matching members, skipping what is there', async function () {
    const result = await migrateUnlocks({ batchSize: 2 });
    assert.deepStrictEqual(result, { scanned: 6, withMember: 3, withExtid: 1, skipped: 2 });
    assert.strictEqual(await Unlocks.find().countAsync(), 0, 'the legacy collection is emptied');

    const moved = await DoorUnlocks.find(in2098, { sort: { timestamp: 1 } }).fetchAsync();
    assert.deepStrictEqual(moved.map((u) => [u.timestamp.getUTCMinutes(), u.memberid || u.extid]), [
      [1, `${prefix}m`],
      [2, `${prefix}m`],
      [3, `${prefix}m`],
      [4, `user-9-${prefix}stranger@example.org`],
      [5, `${prefix}m`],
    ]);
    assert.ok(moved.every((u) => u.door === 'outerDoor' && u.method === 'danalock' && typeof u._id === 'string'));
  });

  it('does nothing a second time', async function () {
    assert.deepStrictEqual(await migrateUnlocks(), { scanned: 0, withMember: 0, withExtid: 0, skipped: 0 });
  });
});
