import assert from 'assert';
import { DoorUnlocks } from '/imports/common/collections/doorunlocks';
import { Members } from '/imports/common/collections/members';
import { doorUnlocksPage, visitBuckets } from '/imports/common/server/doors/doorUnlocks';

const prefix = 'doortest-';

describe('door unlocks', function () {
  before(async function () {
    await Members.insertAsync({ _id: `${prefix}m`, mid: 'D1', name: 'Doortest Person', email: `${prefix}m@example.org` });
    for (const [i, fields] of [{ memberid: `${prefix}m`, method: 'app' }, { extid: `${prefix}guest`, method: 'danalock' }].entries()) {
      await DoorUnlocks.insertAsync({ timestamp: new Date(Date.UTC(2020, 0, 1 + i)), door: `${prefix}door`, ...fields });
    }
  });

  after(async function () {
    await DoorUnlocks.removeAsync({ door: `${prefix}door` });
    await Members.removeAsync({ _id: `${prefix}m` });
  });

  it('pages the openings with names, searching names too', async function () {
    const { rows, total } = await doorUnlocksPage({ search: 'doortest person' });
    assert.strictEqual(total, 1);
    assert.strictEqual(rows[0].memberName, 'Doortest Person');
    const both = await doorUnlocksPage({ search: `${prefix}door`, sort: { field: 'timestamp', direction: 'asc' } });
    assert.deepStrictEqual(both.rows.map((r) => r.method), ['app', 'danalock']);
  });

  it('buckets visits per person', function () {
    assert.deepStrictEqual(visitBuckets({ a: 1, b: 7, c: 7, d: 60 }).counts, [1, 2, 0, 0, 1]);
  });
});
