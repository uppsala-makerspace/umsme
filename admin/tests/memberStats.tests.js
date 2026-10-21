import assert from 'assert';
import { membershipStatistics, memberHistory, periodStart } from '/imports/stats/memberStats';
import { revenueModel } from '/imports/stats/revenueModel';

const d = (iso) => new Date(iso);
const now = d('2026-06-01T12:00:00Z');
const memberships = [
  { _id: 'a1', mid: 'a', type: 'member', start: d('2024-01-10'), memberend: d('2025-01-10') },
  { _id: 'a2', mid: 'a', type: 'member', start: d('2025-01-12'), memberend: d('2026-01-12') },
  { _id: 'b1', mid: 'b', type: 'labandmember', start: d('2025-09-01'), memberend: d('2026-09-01'), labend: d('2026-09-01') },
];
const members = [
  { _id: 'a', name: 'Anna Left', member: d('2026-01-12') },
  { _id: 'b', name: 'Bo Current', member: d('2026-09-01'), lab: d('2026-09-01') },
];

describe('member statistics', function () {
  it('counts the members now, by kind, and the months', function () {
    const { counts, series, monthly } = membershipStatistics(memberships, 'all', now);
    assert.strictEqual(counts.members, 1);
    assert.strictEqual(counts.individualLab, 1);
    assert.ok(series.members.length > 0);
    assert.strictEqual(monthly.labels.length, monthly.joined.length);
  });

  it('copes with a period in which nothing happened', function () {
    const { monthly } = membershipStatistics(memberships, 'month', now);
    assert.deepStrictEqual(monthly.labels, []);
  });

  it('starts a period a year, quarter or month back, or never', function () {
    assert.strictEqual(periodStart('all', now), null);
    assert.strictEqual(periodStart('year', now).getFullYear(), 2025);
  });

  it('lists who has been a member and whether they still are', function () {
    const { stats, rows } = memberHistory(memberships, members, now);
    assert.deepStrictEqual([stats.active, stats.historic, stats.lab], [1, 1, 1]);
    assert.deepStrictEqual(rows.map((r) => [r.name, r.active, r.years]), [['Anna Left', false, 2], ['Bo Current', true, 1]]);
  });

  it('builds the revenue model from payments', function () {
    const model = revenueModel([{ _id: 'p1', date: d('2026-03-03'), amount: 200, membership: 'a2' }], { a2: memberships[1] }, now);
    assert.strictEqual(model.monthly.length, 1);
    assert.ok(model.forecast);
  });
});
