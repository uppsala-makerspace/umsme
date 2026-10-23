import assert from 'assert';
import { day, dateTime, parseDay } from '/imports/ui/dates';

describe('dates as admin writes them', function () {
  it('writes a day and a moment the Swedish way, in local time', function () {
    const d = new Date(2026, 9, 3, 7, 5);
    assert.strictEqual(day(d), '2026-10-03');
    assert.strictEqual(dateTime(d), '2026-10-03 07:05');
    assert.strictEqual(day(null), '');
    assert.strictEqual(day('not a date'), '');
  });

  it('reads a day typed with or without dashes, and nothing else', function () {
    assert.strictEqual(parseDay('2026-10-23'), '2026-10-23');
    assert.strictEqual(parseDay(' 20261023 '), '2026-10-23');
    assert.strictEqual(parseDay(''), '');
    assert.strictEqual(parseDay('2026-02-30'), null);
    assert.strictEqual(parseDay('10/23/2026'), null);
    assert.strictEqual(parseDay('2026-10'), null);
  });
});
