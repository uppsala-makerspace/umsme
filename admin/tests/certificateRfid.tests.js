import assert from 'assert';
import { flagParam, formatTag, rfidExport, machineExport } from '/imports/common/lib/certificateRfid';

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

  describe('formatTag', function () {
    it('writes the bytes in upper case with a dash between', function () {
      assert.strictEqual(formatTag('03d73b99'), '03-D7-3B-99');
      assert.strictEqual(formatTag('03-D7-3B-99'), '03-D7-3B-99');
      assert.strictEqual(formatTag(''), '');
    });
  });

  describe('machineExport', function () {
    const anna = { rfid: '04a1b2c3', name: 'Anna Andersson' };
    const bo = { rfid: '04D4E5F6', name: 'Bo Berg' };

    it('gives a row per holder and machine, sorted by machine and name', function () {
      const rows = machineExport(
        [{ _id: 'saw', machines: ['bandsag2', 'bandsag1'], machineRole: 'user' }],
        { saw: [bo, anna, { rfid: '', name: 'Utan Tagg' }] },
      );
      assert.deepStrictEqual(rows, [
        { tag: '04-A1-B2-C3', machine: 'bandsag1', name: 'Anna Andersson', role: 'user' },
        { tag: '04-D4-E5-F6', machine: 'bandsag1', name: 'Bo Berg', role: 'user' },
        { tag: '04-A1-B2-C3', machine: 'bandsag2', name: 'Anna Andersson', role: 'user' },
        { tag: '04-D4-E5-F6', machine: 'bandsag2', name: 'Bo Berg', role: 'user' },
      ]);
    });

    it('gives a machine and role once, and each role of a machine its own row', function () {
      const rows = machineExport([
        { _id: 'a', machines: ['laser1'], machineRole: 'user' },
        { _id: 'b', machines: ['laser1'], machineRole: 'user' },
        { _id: 'c', machines: ['laser1'], machineRole: 'admin' },
        { _id: 'none' },
      ], { a: [anna], b: [anna], c: [anna], none: [bo] });
      assert.deepStrictEqual(rows.map((r) => r.role), ['admin', 'user']);
      assert.ok(rows.every((r) => r.name === 'Anna Andersson'));
    });

    it('takes the role as user when none is set', function () {
      assert.strictEqual(machineExport([{ _id: 'a', machines: ['m1'] }], { a: [anna] })[0].role, 'user');
    });
  });

  describe('rfidExport', function () {
    it('gives the name and tags only, as before, without includeNames', function () {
      assert.deepStrictEqual(rfidExport(certificate, members), {
        name: 'Laserskärare',
        rfids: ['04-D4-E5-F6', '04-A1-B2-C3', '04-FF-FF-FF'],
      });
    });

    it('adds members sorted by name with includeNames, keeping rfids', function () {
      const body = rfidExport(certificate, members, { includeNames: true });
      assert.deepStrictEqual(body.rfids, ['04-D4-E5-F6', '04-A1-B2-C3', '04-FF-FF-FF']);
      assert.deepStrictEqual(body.members, [
        { rfid: '04-FF-FF-FF', name: '' },
        { rfid: '04-A1-B2-C3', name: 'Anna Andersson' },
        { rfid: '04-D4-E5-F6', name: 'Bo Berg' },
      ]);
    });

    it('falls back to the English name, then to an empty one', function () {
      assert.strictEqual(rfidExport({ name: { en: 'Laser cutter' } }, []).name, 'Laser cutter');
      assert.strictEqual(rfidExport({}, []).name, '');
    });
  });
});
