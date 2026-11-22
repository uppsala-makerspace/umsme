import assert from 'assert';
import { Members } from '/imports/common/collections/members';
import { formatRfid, normalizeRfid, RFID_PATTERN } from '/imports/common/lib/rfid';
import { rfidWithDashes } from '../server/migrations';

describe('rfid', function () {
  describe('formatRfid', function () {
    it('writes the bytes in upper case with a dash between, dropping the rest', function () {
      assert.strictEqual(formatRfid('03d73b99'), '03-D7-3B-99');
      assert.strictEqual(formatRfid('03:d7:3b:99'), '03-D7-3B-99');
      assert.strictEqual(formatRfid(' 03 D7-3B 99 '), '03-D7-3B-99');
      assert.strictEqual(formatRfid('03-D7-3B-99'), '03-D7-3B-99');
    });

    it('keeps an odd last digit while it is typed, which the pattern refuses', function () {
      assert.strictEqual(formatRfid('03d73'), '03-D7-3');
      assert.strictEqual(RFID_PATTERN.test('03-D7-3'), false);
    });

    it('gives nothing for nothing', function () {
      assert.strictEqual(formatRfid(''), '');
      assert.strictEqual(formatRfid(null), '');
      assert.strictEqual(normalizeRfid('  '), null);
      assert.strictEqual(normalizeRfid(undefined), null);
    });
  });

  describe('migration to dashes', function () {
    const prefix = 'rfid-migration-test:';
    const raw = () => Members.rawCollection();
    afterEach(async function () {
      await raw().deleteMany({ _id: { $regex: `^${prefix}` } });
    });

    it('writes old tags with dashes, removes empty ones, and leaves what it cannot mend', async function () {
      await raw().insertMany([
        { _id: `${prefix}old`, name: 'Old', rfid: '03d73b99' },
        { _id: `${prefix}new`, name: 'New', rfid: '04-A1-B2-C3' },
        { _id: `${prefix}empty`, name: 'Empty', rfid: '' },
        { _id: `${prefix}odd`, name: 'Odd', rfid: '03D73' },
      ]);
      await rfidWithDashes();
      await rfidWithDashes();
      const byId = Object.fromEntries((await raw().find({ _id: { $regex: `^${prefix}` } }).toArray()).map((m) => [m._id.slice(prefix.length), m]));
      assert.strictEqual(byId.old.rfid, '03-D7-3B-99');
      assert.strictEqual(byId.new.rfid, '04-A1-B2-C3');
      assert.strictEqual('rfid' in byId.empty, false);
      assert.strictEqual(byId.odd.rfid, '03D73');
    });
  });
});
