import assert from 'assert';
import { flagParam, rfidExport } from '/imports/common/lib/certificateRfid';

const certificate = { name: { sv: 'Laserskärare', en: 'Laser cutter' } };
const members = [
  { _id: 'm2', rfid: '04D4E5F6', name: 'Bo Berg' },
  { _id: 'm1', rfid: '04A1B2C3', name: 'Anna Andersson' },
  { _id: 'm3', rfid: '04FFFFFF' },
  { _id: 'm4', rfid: '', name: 'Utan Tagg' },
];

describe('certificateRfid', function () {
  describe('flagParam', function () {
    it('is on when present without a value, or true, or 1', function () {
      for (const v of ['', 'true', 'TRUE', '1', ' 1 ']) assert.strictEqual(flagParam(v), true, `"${v}"`);
    });
    it('is off when absent, false, 0 or anything else', function () {
      for (const v of [null, undefined, 'false', '0', 'no']) assert.strictEqual(flagParam(v), false, String(v));
    });
  });

  describe('rfidExport', function () {
    it('gives the name and tags only, as before, without includeNames', function () {
      assert.deepStrictEqual(rfidExport(certificate, members), {
        name: 'Laserskärare',
        rfids: ['04D4E5F6', '04A1B2C3', '04FFFFFF'],
      });
    });

    it('adds members sorted by name with includeNames, keeping rfids', function () {
      const body = rfidExport(certificate, members, { includeNames: true });
      assert.deepStrictEqual(body.rfids, ['04D4E5F6', '04A1B2C3', '04FFFFFF']);
      assert.deepStrictEqual(body.members, [
        { rfid: '04FFFFFF', name: '' },
        { rfid: '04A1B2C3', name: 'Anna Andersson' },
        { rfid: '04D4E5F6', name: 'Bo Berg' },
      ]);
    });

    it('falls back to the English name, then to an empty one', function () {
      assert.strictEqual(rfidExport({ name: { en: 'Laser cutter' } }, []).name, 'Laser cutter');
      assert.strictEqual(rfidExport({}, []).name, '');
    });
  });
});
