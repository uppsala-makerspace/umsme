import assert from 'assert';
import {
  classify,
  monthlySeries,
  yearlySeries,
  yearlyGrowth,
  rollingTwelve,
  yearOverYear,
  linearFit,
  forecast,
  excludedSummary,
} from '/imports/stats/revenueSeries';

const d = (iso) => new Date(iso);

/** A membership document, with only the fields classify reads. */
const ms = (id, type, extra = {}) => ({ _id: id, type, ...extra });

/** A payment, with only the fields the series building reads. */
const pay = (date, amount, membership, extra = {}) => ({
  date: d(date),
  amount,
  ...(membership ? { membership } : {}),
  ...extra,
});

const index = (list) => Object.fromEntries(list.map((m) => [m._id, m]));

describe('Revenue statistics', function () {
  describe('classify', function () {
    it('separates the four yearly kinds', function () {
      assert.strictEqual(classify(ms('a', 'member')), 'member');
      assert.strictEqual(classify(ms('b', 'member', { family: true })), 'family');
      assert.strictEqual(
        classify(ms('c', 'labandmember', { start: d('2026-01-01'), labend: d('2027-01-01') })),
        'lab',
      );
      assert.strictEqual(
        classify(ms('d', 'labandmember', {
          family: true, start: d('2026-01-01'), labend: d('2027-01-01'),
        })),
        'familyLab',
      );
    });

    it('treats a standalone lab document as quarterly', function () {
      assert.strictEqual(classify(ms('e', 'lab')), 'quarterlyLab');
    });

    it('lets quarterly outrank family', function () {
      // A handful of these exist: a family quarterly lab is still the quarterly
      // product, and the association sells it as its own thing.
      const quarterlyFamily = ms('f', 'labandmember', {
        family: true, start: d('2026-01-01'), labend: d('2026-04-01'),
      });
      assert.strictEqual(classify(quarterlyFamily), 'quarterlyLab');
    });

    it('splits legacy combined documents on the 180-day lab span', function () {
      // A quarter is ~91 days and a year ~365, so the boundary is never close in
      // real data — but the rule must not drift from memberStatus.
      const justUnder = ms('g', 'labandmember', {
        start: d('2026-01-01'), labend: d('2026-06-15'), // 165 days
      });
      const justOver = ms('h', 'labandmember', {
        start: d('2026-01-01'), labend: d('2026-07-15'), // 195 days
      });
      assert.strictEqual(classify(justUnder), 'quarterlyLab');
      assert.strictEqual(classify(justOver), 'lab');
    });

    it('does not call a membership without a lab span quarterly', function () {
      assert.strictEqual(classify(ms('i', 'labandmember', { start: d('2026-01-01') })), 'lab');
    });
  });

  describe('monthlySeries', function () {
    const memberships = index([
      ms('m1', 'member'),
      ms('m2', 'labandmember', { start: d('2026-01-01'), labend: d('2027-01-01') }),
    ]);

    it('sums per month and per category', function () {
      const series = monthlySeries(
        [pay('2026-01-10', 200, 'm1'), pay('2026-01-20', 1200, 'm2')],
        memberships,
      );
      assert.strictEqual(series.length, 1);
      assert.strictEqual(series[0].month, '2026-01');
      assert.strictEqual(series[0].total, 1400);
      assert.strictEqual(series[0].byCategory.member, 200);
      assert.strictEqual(series[0].byCategory.lab, 1200);
      assert.strictEqual(series[0].byCategory.family, 0);
    });

    it('fills empty months instead of closing the gap', function () {
      const series = monthlySeries(
        [pay('2026-01-10', 200, 'm1'), pay('2026-04-10', 300, 'm1')],
        memberships,
      );
      assert.deepStrictEqual(series.map((m) => m.month), ['2026-01', '2026-02', '2026-03', '2026-04']);
      assert.deepStrictEqual(series.map((m) => m.total), [200, 0, 0, 300]);
    });

    it('crosses the year boundary', function () {
      const series = monthlySeries(
        [pay('2025-12-10', 100, 'm1'), pay('2026-02-10', 100, 'm1')],
        memberships,
      );
      assert.deepStrictEqual(series.map((m) => m.month), ['2025-12', '2026-01', '2026-02']);
    });

    it('leaves out everything that is not membership revenue', function () {
      const series = monthlySeries(
        [
          pay('2026-01-10', 200, 'm1'),
          pay('2026-01-11', 500, null, { other: true }),
          pay('2026-01-12', 700, null, { storeItem: 'si1' }),
          pay('2026-01-13', 900, null),               // unclassified
          pay('2026-01-14', 400, 'gone'),             // dangling link
        ],
        memberships,
      );
      assert.strictEqual(series[0].total, 200);
    });

    it('is empty when nothing qualifies', function () {
      assert.deepStrictEqual(monthlySeries([pay('2026-01-10', 500, null)], memberships), []);
    });
  });

  describe('yearlySeries', function () {
    it('rolls months up into years', function () {
      const memberships = index([ms('m1', 'member'), ms('m2', 'member', { family: true })]);
      const monthly = monthlySeries(
        [
          pay('2025-03-01', 100, 'm1'),
          pay('2025-11-01', 200, 'm2'),
          pay('2026-02-01', 400, 'm1'),
        ],
        memberships,
      );
      const yearly = yearlySeries(monthly);
      assert.deepStrictEqual(yearly.map((y) => [y.year, y.total]), [[2025, 300], [2026, 400]]);
      assert.strictEqual(yearly[0].byCategory.family, 200);
      assert.strictEqual(yearly[1].byCategory.member, 400);
    });
  });

  describe('yearlyGrowth', function () {
    const memberships = index([ms('m1', 'member')]);
    /** One payment per listed month, so the yearly totals are easy to reason about. */
    const build = (spec) =>
      monthlySeries(
        Object.entries(spec).flatMap(([month, amount]) => [pay(`${month}-15`, amount, 'm1')]),
        memberships,
      );

    it('compares two finished years as whole years', function () {
      const monthly = build({ '2023-06': 100, '2024-06': 150 });
      const rows = yearlyGrowth(monthly, d('2025-05-10'));
      const y2024 = rows.find((r) => r.year === 2024);
      assert.strictEqual(y2024.growth, 0.5);
      assert.strictEqual(y2024.partial, false);
    });

    it('gives the first year no growth', function () {
      const rows = yearlyGrowth(build({ '2023-06': 100, '2024-06': 150 }), d('2025-05-10'));
      assert.strictEqual(rows.find((r) => r.year === 2023).growth, null);
    });

    it('compares the year in progress like for like', function () {
      // Half of last year fell after June, so a whole-year comparison would read
      // as a fall while the comparable months are up by half.
      const monthly = build({
        '2025-01': 100, '2025-02': 100, '2025-09': 500,
        '2026-01': 150, '2026-02': 150,
      });
      const rows = yearlyGrowth(monthly, d('2026-02-20'));
      const current = rows.find((r) => r.year === 2026);
      assert.strictEqual(current.partial, true);
      assert.strictEqual(current.comparedFrom, 200); // Jan+Feb 2025
      assert.strictEqual(current.comparedTo, 300);   // Jan+Feb 2026
      assert.strictEqual(current.growth, 0.5);
      // The naive comparison, for contrast: 300 against a full year of 700.
      assert.strictEqual(current.total, 300);
    });

    it('counts the whole current month in the comparison', function () {
      // Both sides are cut at the same month, so a part-paid current month
      // understates a little — but it never flips the sign.
      const monthly = build({ '2025-03': 100, '2026-03': 200 });
      const rows = yearlyGrowth(monthly, d('2026-03-02'));
      assert.strictEqual(rows.find((r) => r.year === 2026).growth, 1);
    });

    it('gives no growth when the earlier period was zero', function () {
      const monthly = build({ '2025-09': 100, '2026-03': 200 });
      // Comparing through March: nothing was paid in Jan–Mar 2025.
      const rows = yearlyGrowth(monthly, d('2026-03-20'));
      assert.strictEqual(rows.find((r) => r.year === 2026).comparedFrom, 0);
      assert.strictEqual(rows.find((r) => r.year === 2026).growth, null);
    });

    it('marks a first year the records only cover part of', function () {
      // The real series starts in October 2019, which makes 2020 look like it
      // grew sixfold. The rows say so rather than leaving the number bare.
      const monthly = build({ '2019-10': 100, '2020-06': 500 });
      const rows = yearlyGrowth(monthly, d('2026-08-29'));
      const first = rows.find((r) => r.year === 2019);
      const second = rows.find((r) => r.year === 2020);
      assert.strictEqual(first.startsMidYear, true);
      assert.strictEqual(first.coversFrom, '2019-10');
      assert.strictEqual(second.startsMidYear, false);
      assert.strictEqual(second.baseIsPartial, true);
      assert.strictEqual(second.growth, 4);
    });

    it('does not flag a base year the records cover in full', function () {
      const monthly = build({ '2023-01': 100, '2024-06': 150 });
      const rows = yearlyGrowth(monthly, d('2026-08-29'));
      assert.strictEqual(rows.find((r) => r.year === 2023).startsMidYear, false);
      assert.strictEqual(rows.find((r) => r.year === 2024).baseIsPartial, false);
    });

    it('reports a fall as a negative number', function () {
      const monthly = build({ '2023-06': 200, '2024-06': 150 });
      assert.strictEqual(yearlyGrowth(monthly, d('2025-05-10')).find((r) => r.year === 2024).growth, -0.25);
    });
  });

  describe('rollingTwelve', function () {
    const monthly = Array.from({ length: 15 }, (_, i) => ({
      month: `2025-${String(i + 1).padStart(2, '0')}`,
      total: 100,
      byCategory: {},
    }));

    it('starts at the twelfth month', function () {
      const rolling = rollingTwelve(monthly);
      assert.strictEqual(rolling.length, 4);
      assert.strictEqual(rolling[0].month, monthly[11].month);
    });

    it('sums exactly twelve months', function () {
      assert.strictEqual(rollingTwelve(monthly)[0].total, 1200);
    });

    it('is empty before a full year of history', function () {
      assert.deepStrictEqual(rollingTwelve(monthly.slice(0, 11)), []);
    });
  });

  describe('yearOverYear', function () {
    const monthly = monthlySeries(
      [
        pay('2025-03-01', 100, 'm1'),
        pay('2026-03-01', 150, 'm1'),
        pay('2026-08-01', 400, 'm1'),
      ],
      index([ms('m1', 'member')]),
    );

    it('returns twelve months, oldest first, ending on today', function () {
      const rows = yearOverYear(monthly, d('2026-08-15'));
      assert.strictEqual(rows.length, 12);
      assert.strictEqual(rows[0].month, '2025-09');
      assert.strictEqual(rows[11].month, '2026-08');
    });

    it('pairs each month with the same month a year earlier', function () {
      const march = yearOverYear(monthly, d('2026-08-15')).find((r) => r.month === '2026-03');
      assert.strictEqual(march.total, 150);
      assert.strictEqual(march.previousYear, 100);
      assert.strictEqual(march.diff, 50);
      assert.strictEqual(march.percent, 0.5);
    });

    it('reports no previous year where the history does not reach', function () {
      // The series starts 2025-03, so 2025-09 has no 2024-09 to compare against.
      const row = yearOverYear(monthly, d('2026-08-15')).find((r) => r.month === '2025-09');
      assert.strictEqual(row.previousYear, null);
      assert.strictEqual(row.diff, null);
      assert.strictEqual(row.percent, null);
    });

    it('gives no percentage when the earlier month was zero', function () {
      // 2026-08 is 400 against a 2025-08 that exists in the series but is empty:
      // growth from nothing has no meaningful percentage.
      const row = yearOverYear(monthly, d('2026-08-15')).find((r) => r.month === '2026-08');
      assert.strictEqual(row.previousYear, 0);
      assert.strictEqual(row.diff, 400);
      assert.strictEqual(row.percent, null);
    });
  });

  describe('linearFit', function () {
    it('recovers a known line exactly', function () {
      const points = Array.from({ length: 10 }, (_, x) => ({ x, y: 5 * x + 3 }));
      const fit = linearFit(points);
      assert.ok(Math.abs(fit.slope - 5) < 1e-9);
      assert.ok(Math.abs(fit.intercept - 3) < 1e-9);
      assert.ok(Math.abs(fit.at(20) - 103) < 1e-9);
    });

    it('gives a flat line for constant data', function () {
      const fit = linearFit(Array.from({ length: 5 }, (_, x) => ({ x, y: 42 })));
      assert.ok(Math.abs(fit.slope) < 1e-9);
      assert.ok(Math.abs(fit.at(100) - 42) < 1e-9);
    });

    it('survives an empty or single-point series', function () {
      assert.strictEqual(linearFit([]).slope, 0);
      assert.strictEqual(linearFit([{ x: 3, y: 7 }]).slope, 0);
    });
  });

  describe('forecast', function () {
    /** n complete months of `amount` each, ending the month before `endMonth`. */
    const flatHistory = (n, amount, startYear = 2023) =>
      Array.from({ length: n }, (_, i) => ({
        month: `${startYear + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`,
        total: amount,
        byCategory: {},
      }));

    it('reads a steady level off a flat history', function () {
      // 36 months at 1000 kr: the annual run rate is 12000 and not moving.
      const monthly = flatHistory(36, 1000);
      const f = forecast({ monthly, today: d('2026-01-15') });
      assert.ok(Math.abs(f.level - 12000) < 1e-6);
      assert.ok(Math.abs(f.slope) < 1e-6);
    });

    it('is not fooled by seasonality, whichever month the window opens on', function () {
      // The trap this whole module is shaped around: a series with a strong
      // yearly cycle and no growth at all. Fitted to monthly values the slope
      // would swing with the starting month; fitted to the rolling sum it must
      // be flat from every vantage point.
      const seasonal = Array.from({ length: 48 }, (_, i) => ({
        month: `${2022 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`,
        total: 1000 + 800 * Math.sin((2 * Math.PI * i) / 12),
        byCategory: {},
      }));
      const slopes = [3, 6, 9, 12].map((cut) => {
        const monthly = seasonal.slice(0, seasonal.length - cut);
        return forecast({ monthly, today: d('2026-06-15') }).slope;
      });
      slopes.forEach((s) => assert.ok(Math.abs(s) < 1e-6, `slope ${s} should be flat`));
    });

    it('projects next year off the fitted slope', function () {
      // Run rate rising by exactly 120 kr/month: each month is 10 kr more than
      // the last, so twelve months later the annual rate is 1440 higher.
      const monthly = Array.from({ length: 36 }, (_, i) => ({
        month: `${2023 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`,
        total: 1000 + 10 * i,
        byCategory: {},
      }));
      const f = forecast({ monthly, today: d('2026-01-15') });
      assert.ok(Math.abs(f.slope - 120) < 1e-6, `slope was ${f.slope}`);
      const next = f.years.find((y) => y.year === 2027);
      // Flat holds the run rate; trend adds a year of climbing on top.
      assert.ok(next.trend.total > next.flat.total);
      assert.ok(Math.abs(next.flat.total - f.level) < 1e-6);
    });

    it('adds actual revenue to a projection of the rest of this year', function () {
      const monthly = flatHistory(36, 1000); // through 2025-12
      monthly.push({ month: '2026-01', total: 900, byCategory: {} });
      const f = forecast({ monthly, today: d('2026-01-16') }); // half of January gone
      const year = f.years.find((y) => y.year === 2026);
      assert.strictEqual(year.flat.actual, 900);
      // Eleven whole months left plus roughly half of January.
      const monthlyRate = f.level / 12;
      assert.ok(Math.abs(year.flat.projected - monthlyRate * 11.484) < monthlyRate * 0.1);
      assert.strictEqual(year.flat.total, year.flat.actual + year.flat.projected);
    });

    it('excludes the part-paid current month from the fit', function () {
      // A collapsed current month must not bend the line: it is incomplete, not
      // a downturn.
      const monthly = flatHistory(36, 1000);
      const withPartial = [...monthly, { month: '2026-01', total: 12, byCategory: {} }];
      const clean = forecast({ monthly, today: d('2026-01-05') });
      const partial = forecast({ monthly: withPartial, today: d('2026-01-05') });
      assert.ok(Math.abs(clean.slope - partial.slope) < 1e-9);
      assert.ok(Math.abs(clean.level - partial.level) < 1e-9);
    });

    it('sums the trailing year day-exactly, not by month', function () {
      const memberships = index([ms('m1', 'member')]);
      const payments = [
        pay('2025-08-20', 100, 'm1'), // just outside a year back
        pay('2025-09-05', 200, 'm1'),
        pay('2026-08-01', 300, 'm1'),
        pay('2026-09-01', 400, 'm1'), // in the future
      ];
      const f = forecast({
        monthly: monthlySeries(payments, memberships),
        today: d('2026-08-29'),
        payments,
        membershipsById: memberships,
      });
      assert.strictEqual(f.trailingYear, 500);
    });

    it('copes with less than a year of history', function () {
      const f = forecast({ monthly: flatHistory(5, 1000), today: d('2023-06-10') });
      assert.strictEqual(f.level, 0);
      assert.deepStrictEqual(f.years, []);
    });
  });

  describe('excludedSummary', function () {
    it('counts each kind of payment the graph leaves out', function () {
      const memberships = index([ms('m1', 'member')]);
      const summary = excludedSummary(
        [
          pay('2026-01-01', 200, 'm1'),
          pay('2026-01-02', 500, null, { other: true }),
          pay('2026-01-03', 700, null, { storeItem: 'si1' }),
          pay('2026-01-04', 900, null),
          pay('2026-01-05', 400, 'gone'),
        ],
        memberships,
      );
      assert.deepStrictEqual(summary.other, { count: 1, sum: 500 });
      assert.deepStrictEqual(summary.storePurchase, { count: 1, sum: 700 });
      assert.deepStrictEqual(summary.unclassified, { count: 1, sum: 900 });
      assert.deepStrictEqual(summary.danglingMembership, { count: 1, sum: 400 });
    });
  });
});
