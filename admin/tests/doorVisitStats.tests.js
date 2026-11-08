import assert from 'assert';
import { DoorUnlocks } from '/imports/common/collections/doorunlocks';
import { doorVisitStats, memberDays, weekdayAverages } from '/imports/common/server/doors/visitStats';

// The test's openings are in 2099, and `now` too, so that the day and month
// views see only them; the quarter and year views reach back to the first
// opening of any test, and are checked at their end.
const prefix = 'visitstest-';
const a = `${prefix}a`;
const b = `${prefix}b`;
const now = new Date('2099-06-15T10:00:00Z');

const unlock = (memberid, iso, extra = {}) =>
  DoorUnlocks.insertAsync({ timestamp: new Date(iso), door: `${prefix}door`, method: 'app', ...(memberid ? { memberid } : {}), ...extra });

const bar = (stats, key) => stats.bars.find((x) => x.key === key);

describe('door visit statistics', function () {
  before(async function () {
    // 10 March: A twice and B once, two visits.
    await unlock(a, '2099-03-10T08:00:00Z');
    await unlock(a, '2099-03-10T15:00:00Z');
    await unlock(b, '2099-03-10T12:00:00Z');
    // A lock user the sync could not tie to a member: no visit.
    await unlock(null, '2099-03-12T12:00:00Z', { extid: `${prefix}guest` });
    // 23:30 Swedish summer time on 31 March is still March; 00:30 on 2 April is April.
    await unlock(a, '2099-03-31T21:30:00Z');
    await unlock(a, '2099-04-01T22:30:00Z');
    // A on ten days in May: ten visits, one member.
    for (let d = 1; d <= 10; d += 1) await unlock(a, `2099-05-${String(d).padStart(2, '0')}T09:00:00Z`);
    // After `now`: never counted.
    await unlock(b, '2099-07-01T09:00:00Z');
  });

  after(async function () {
    await DoorUnlocks.removeAsync({ door: `${prefix}door` });
  });

  it('gives the member-days, in Swedish time, without lock users', async function () {
    const days = await memberDays({ fromDay: '2099-03-01', toDay: '2099-04-30' });
    const mine = days.filter((d) => d.memberid.startsWith(prefix)).map((d) => `${d.day} ${d.memberid.slice(prefix.length)}`).sort();
    assert.deepStrictEqual(mine, ['2099-03-10 a', '2099-03-10 b', '2099-03-31 a', '2099-04-02 a']);
  });

  it('counts the visits per day of a month', async function () {
    const stats = await doorVisitStats({ view: 'day', month: '2099-03', now });
    assert.strictEqual(stats.month, '2099-03');
    assert.strictEqual(stats.bars.length, 31);
    assert.deepStrictEqual(bar(stats, '2099-03-10'), { key: '2099-03-10', visits: 2, unique: 2 });
    assert.deepStrictEqual(bar(stats, '2099-03-31'), { key: '2099-03-31', visits: 1, unique: 1 });
    assert.deepStrictEqual(bar(stats, '2099-03-12'), { key: '2099-03-12', visits: 0, unique: 0 });
    assert.deepStrictEqual(stats.total, { visits: 3, unique: 2 });
    assert.deepStrictEqual(stats.average, { visits: 3 / 31, unique: 3 / 31, over: 31 }, 'a past month: all its days');
  });

  it('averages the current month over the days up to today', async function () {
    const stats = await doorVisitStats({ view: 'day', month: '2099-06', now });
    assert.strictEqual(stats.bars.length, 15);
    assert.strictEqual(stats.average.over, 15);
  });

  it('counts visits and unique members per month, up to now', async function () {
    const stats = await doorVisitStats({ view: 'month', year: 2099, now });
    assert.deepStrictEqual(stats.bars.map((x) => x.key), ['2099-01', '2099-02', '2099-03', '2099-04', '2099-05', '2099-06']);
    assert.deepStrictEqual(bar(stats, '2099-03'), { key: '2099-03', visits: 3, unique: 2 });
    assert.deepStrictEqual(bar(stats, '2099-04'), { key: '2099-04', visits: 1, unique: 1 });
    assert.deepStrictEqual(bar(stats, '2099-05'), { key: '2099-05', visits: 10, unique: 1 }, 'ten visits, one member');
    assert.deepStrictEqual(stats.total, { visits: 14, unique: 2 }, 'the visit in July is after now');
    // June is unfinished: the average is over January to May.
    assert.deepStrictEqual(stats.average, { visits: 14 / 5, unique: 4 / 5, over: 5 });
  });

  it('counts per quarter and per year, from the first opening on', async function () {
    const quarters = await doorVisitStats({ view: 'quarter', now });
    const keys = quarters.bars.map((x) => x.key);
    assert.strictEqual(keys[keys.length - 1], '2099-Q2');
    assert.deepStrictEqual(bar(quarters, '2099-Q1'), { key: '2099-Q1', visits: 3, unique: 2 });
    assert.deepStrictEqual(bar(quarters, '2099-Q2'), { key: '2099-Q2', visits: 11, unique: 1 });
    // No gaps between the first quarter and the last.
    const index = (k) => Number(k.slice(0, 4)) * 4 + Number(k.slice(6)) - 1;
    assert.strictEqual(index(keys[keys.length - 1]) - index(keys[0]) + 1, keys.length);

    const years = await doorVisitStats({ view: 'year', now });
    assert.deepStrictEqual(years.bars[years.bars.length - 1], { key: '2099', visits: 14, unique: 2 });
    assert.strictEqual(Number(years.bars[years.bars.length - 1].key) - Number(years.bars[0].key) + 1, years.bars.length);
  });

  it('offers the months and years from the first opening to now, newest first', async function () {
    const { available } = await doorVisitStats({ view: 'day', now });
    assert.strictEqual(available.months[0], '2099-06');
    assert.strictEqual(available.years[0], 2099);
    assert.ok(available.months.every((m, i) => i === 0 || m < available.months[i - 1]));
  });

  it('averages the visits per weekday over the days shown', async function () {
    // 10 March 2099 is a Tuesday: two visits; 31 March a Tuesday too: one.
    const march = await doorVisitStats({ view: 'day', month: '2099-03', now });
    assert.deepStrictEqual(march.weekdays.map((w) => w.weekday), ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    assert.strictEqual(march.weekdays.reduce((sum, w) => sum + w.days, 0), 31);
    const tuesday = march.weekdays[1];
    assert.deepStrictEqual(tuesday, { weekday: 'Tue', days: 5, visits: 3, average: 3 / 5 });

    // The year up to now: 1 January to 15 June, 166 days, all its 14 visits.
    const year = await doorVisitStats({ view: 'month', year: 2099, now });
    assert.strictEqual(year.weekdays.reduce((sum, w) => sum + w.days, 0), 166);
    assert.strictEqual(year.weekdays.reduce((sum, w) => sum + w.visits, 0), 14);

    const quarters = await doorVisitStats({ view: 'quarter', now });
    assert.strictEqual(quarters.weekdays, undefined, 'not per quarter or year');
  });

  it('counts days without visits in the weekday average', function () {
    // A week, Monday 2099-03-02 to Sunday 2099-03-08, plus the next Monday.
    const rows = weekdayAverages('2099-03-02', '2099-03-09', { '2099-03-02': 4 });
    assert.deepStrictEqual(rows[0], { weekday: 'Mon', days: 2, visits: 4, average: 2 });
    assert.deepStrictEqual(rows[6], { weekday: 'Sun', days: 1, visits: 0, average: 0 });
  });

  it('has nothing for a month after now', async function () {
    const stats = await doorVisitStats({ view: 'day', month: '2099-08', now });
    assert.deepStrictEqual(stats.bars, []);
    assert.deepStrictEqual(stats.total, { visits: 0, unique: 0 });
  });
});
