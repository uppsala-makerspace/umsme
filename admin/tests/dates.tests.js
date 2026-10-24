import assert from 'assert';
import { day, dateTime, parseDay, expiryTone } from '/imports/ui/dates';

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

  it('tells how an end date stands: passed, within a month, or later', function () {
    const now = new Date(2026, 9, 24, 15, 0);
    assert.strictEqual(expiryTone(new Date(2026, 9, 23), now), 'past');
    assert.strictEqual(expiryTone(new Date(2026, 9, 24), now), 'soon');
    assert.strictEqual(expiryTone(new Date(2026, 10, 24), now), 'soon');
    assert.strictEqual(expiryTone(new Date(2026, 10, 25), now), 'later');
    assert.strictEqual(expiryTone(null, now), null);
  });
});
