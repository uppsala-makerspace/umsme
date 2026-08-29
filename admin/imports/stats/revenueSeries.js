/**
 * Turns Payment documents into the membership-revenue series the economy
 * statistics page graphs, tabulates and forecasts.
 *
 * Pure: takes plain arrays, no Meteor collections, so it can be unit tested
 * without a database (see admin/tests/revenueSeries.tests.js).
 *
 * What counts as membership revenue: a payment linked to a membership document.
 * That is the same definition the Memberships tab uses — a membership link is
 * what proves the money was not clay, a course or some other income. Payments
 * marked `other`, webshop purchases and unclassified payments are left out, and
 * the page reports what it left out so the graph is not mistaken for the
 * association's whole income.
 *
 * The amount comes from the payment, not from the membership it paid for: the
 * payment is the money that actually arrived, and the two differ in a minority
 * of records (a 2000 kr payment against a membership booked at 1000 kr).
 *
 * Cash basis, deliberately: a yearly membership lands in full in the month it
 * was paid. That makes the monthly series strongly seasonal, which is why the
 * trend is fitted to the rolling twelve-month sum rather than to the monthly
 * values — see forecast().
 */

import { QUARTERLY_LAB_MAX_DAYS } from '/imports/common/lib/timeConstants.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/** The five categories, in the order they should be drawn and tabulated. */
export const CATEGORIES = ['member', 'family', 'lab', 'familyLab', 'quarterlyLab'];

export const CATEGORY_LABELS = {
  member: 'Membership',
  family: 'Family membership',
  lab: 'Membership + lab',
  familyLab: 'Family membership + lab',
  quarterlyLab: 'Quarterly lab',
};

/** "2026-08" for a date, in local time — the months a treasurer reads. */
export const monthKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const addMonths = (key, n) => {
  const [y, m] = key.split('-').map(Number);
  const total = y * 12 + (m - 1) + n;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
};

/** Whole months between two keys, b − a. */
const monthDiff = (a, b) => {
  const [ay, am] = a.split('-').map(Number);
  const [by, bm] = b.split('-').map(Number);
  return (by - ay) * 12 + (bm - am);
};

/**
 * Which of the five kinds of revenue one membership represents.
 *
 * Quarterly is decided first and outranks family: the association sells a
 * quarterly lab as its own product, and a handful of them are family ones. The
 * rule for "quarterly" mirrors memberStatus in common/lib/utils.js — a dedicated
 * 'lab' document, or a legacy combined document whose lab span is a quarter
 * rather than a year.
 *
 * @param {{type: string, family?: boolean, start?: Date, labend?: Date}} ms
 * @returns {'member'|'family'|'lab'|'familyLab'|'quarterlyLab'}
 */
export const classify = (ms) => {
  const labDays =
    ms.labend && ms.start ? (ms.labend.getTime() - ms.start.getTime()) / DAY_MS : null;
  const quarterly =
    ms.type === 'lab' || (labDays !== null && labDays < QUARTERLY_LAB_MAX_DAYS);
  if (quarterly) return 'quarterlyLab';
  if (ms.type === 'labandmember') return ms.family ? 'familyLab' : 'lab';
  return ms.family ? 'family' : 'member';
};

const emptyCategories = () =>
  Object.fromEntries(CATEGORIES.map((c) => [c, 0]));

/**
 * Membership revenue per calendar month, oldest first, with empty months filled
 * in so a graph does not close the gaps and imply revenue that never happened.
 *
 * @param {Array<{date: Date, amount: number, membership?: string}>} payments
 * @param {Object<string, object>} membershipsById
 * @returns {Array<{month: string, total: number, byCategory: object}>}
 */
export const monthlySeries = (payments, membershipsById) => {
  const buckets = {};
  payments.forEach((p) => {
    if (!p.membership) return;
    const ms = membershipsById[p.membership];
    if (!ms) return; // a link to a membership that no longer exists
    const key = monthKey(p.date);
    const bucket = (buckets[key] = buckets[key] || { total: 0, byCategory: emptyCategories() });
    bucket.total += p.amount;
    bucket.byCategory[classify(ms)] += p.amount;
  });

  const keys = Object.keys(buckets).sort();
  if (keys.length === 0) return [];

  const series = [];
  for (let key = keys[0]; monthDiff(key, keys[keys.length - 1]) >= 0; key = addMonths(key, 1)) {
    const bucket = buckets[key] || { total: 0, byCategory: emptyCategories() };
    series.push({ month: key, total: bucket.total, byCategory: bucket.byCategory });
  }
  return series;
};

/**
 * The same money per calendar year, for the coarser table.
 *
 * @param {Array<object>} monthly - from monthlySeries
 * @returns {Array<{year: number, total: number, byCategory: object}>}
 */
export const yearlySeries = (monthly) => {
  const byYear = {};
  monthly.forEach((m) => {
    const year = Number(m.month.split('-')[0]);
    const row = (byYear[year] = byYear[year] || { year, total: 0, byCategory: emptyCategories() });
    row.total += m.total;
    CATEGORIES.forEach((c) => { row.byCategory[c] += m.byCategory[c]; });
  });
  return Object.values(byYear).sort((a, b) => a.year - b.year);
};

/**
 * The yearly rows with growth against the year before.
 *
 * For a finished year that is simply one annual total against the previous one.
 * For the year in progress it is like-for-like — the months elapsed this year
 * against the same months last year — because measuring a part year against a
 * whole one shows a fall in the middle of a rise: eight months of 2026 against
 * all of 2025 reads as −26% while the association is in fact growing by a
 * quarter.
 *
 * `growth` is null where there is nothing to compare against: the first year of
 * the series, or a previous period of zero.
 *
 * @param {Array<object>} monthly - from monthlySeries
 * @param {Date} today
 * @returns {Array<{year, total, byCategory, partial: boolean, growth: number|null,
 *                  comparedFrom: number|null, comparedTo: number|null}>}
 */
export const yearlyGrowth = (monthly, today) => {
  const yearly = yearlySeries(monthly);
  const currentYear = today.getFullYear();
  const throughMonth = today.getMonth() + 1;

  const sumThrough = (year, lastMonth) =>
    monthly.reduce((sum, m) => {
      const [y, mo] = m.month.split('-').map(Number);
      return y === year && mo <= lastMonth ? sum + m.total : sum;
    }, 0);

  const totalsByYear = Object.fromEntries(yearly.map((y) => [y.year, y.total]));
  // The series starts whenever the first payment was made, so its first year can
  // cover only part of a year. Reported per row, because it makes the next
  // year's growth look spectacular against a stub base.
  const firstMonthOf = (year) =>
    (monthly.find((m) => Number(m.month.split('-')[0]) === year) || {}).month;

  return yearly.map((row) => {
    const partial = row.year === currentYear;
    const startsMidYear = firstMonthOf(row.year) !== `${row.year}-01`;
    const base = { ...row, partial, startsMidYear, coversFrom: firstMonthOf(row.year) };
    const hasPrevious = row.year - 1 in totalsByYear;
    if (!hasPrevious) {
      return { ...base, growth: null, comparedFrom: null, comparedTo: null };
    }
    const to = partial ? sumThrough(row.year, throughMonth) : row.total;
    const from = partial ? sumThrough(row.year - 1, throughMonth) : totalsByYear[row.year - 1];
    return {
      ...base,
      // True when the year being compared against is itself a stub, which
      // inflates the percentage.
      baseIsPartial: !partial && firstMonthOf(row.year - 1) !== `${row.year - 1}-01`,
      growth: from ? (to - from) / from : null,
      comparedFrom: from,
      comparedTo: to,
    };
  });
};

/**
 * Trailing twelve-month sum at each month, from the twelfth month onwards.
 * Seasonally neutral by construction: every point covers one whole year, so it
 * cannot be tilted by which month the window happens to start in.
 *
 * @param {Array<object>} monthly
 * @returns {Array<{month: string, total: number}>}
 */
export const rollingTwelve = (monthly) =>
  monthly
    .map((m, i) =>
      i < 11
        ? null
        : {
            month: m.month,
            total: monthly.slice(i - 11, i + 1).reduce((sum, x) => sum + x.total, 0),
          })
    .filter(Boolean);

/**
 * The last twelve months against the same months a year earlier, newest last.
 * Reading growth straight off the pairs catches what a rolling average hides:
 * which individual months are actually growing.
 *
 * `previousYear` is null where the history does not reach back that far, and
 * `percent` is null when the earlier month was zero — growth from nothing has no
 * meaningful percentage.
 *
 * @param {Array<object>} monthly
 * @param {Date} today
 * @returns {Array<{month: string, total: number, previousYear: number|null,
 *                  diff: number|null, percent: number|null}>}
 */
export const yearOverYear = (monthly, today) => {
  const totals = Object.fromEntries(monthly.map((m) => [m.month, m.total]));
  const current = monthKey(today);
  const out = [];
  for (let i = 11; i >= 0; i--) {
    const month = addMonths(current, -i);
    const previousKey = addMonths(month, -12);
    const total = totals[month] ?? 0;
    const previousYear = previousKey in totals ? totals[previousKey] : null;
    out.push({
      month,
      total,
      previousYear,
      diff: previousYear === null ? null : total - previousYear,
      percent: previousYear ? (total - previousYear) / previousYear : null,
    });
  }
  return out;
};

/**
 * Least-squares fit of y against x.
 *
 * @param {Array<{x: number, y: number}>} points
 * @returns {{slope: number, intercept: number, at: function(number): number}}
 */
export const linearFit = (points) => {
  const n = points.length;
  if (n === 0) return { slope: 0, intercept: 0, at: () => 0 };
  const sx = points.reduce((s, p) => s + p.x, 0);
  const sy = points.reduce((s, p) => s + p.y, 0);
  const sxx = points.reduce((s, p) => s + p.x * p.x, 0);
  const sxy = points.reduce((s, p) => s + p.x * p.y, 0);
  const denominator = n * sxx - sx * sx;
  const slope = denominator === 0 ? 0 : (n * sxy - sx * sy) / denominator;
  const intercept = (sy - slope * sx) / n;
  return { slope, intercept, at: (x) => intercept + slope * x };
};

const daysInMonth = (key) => {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m, 0).getDate();
};

/**
 * Everything the page needs to state where revenue stands and where it is going.
 *
 * The trend is fitted to the rolling twelve-month sum, not to the monthly
 * values. On real data the monthly fit slopes *downwards* through an unbroken
 * multi-year rise, purely because the window happens to open on the two biggest
 * months of the year — the seasonality, not the business, decides the sign.
 *
 * The current calendar month is excluded from the fit: it is only part paid, so
 * including it drags the line down for a reason that has nothing to do with the
 * trend. It still counts as actual revenue in the year-to-date figure, because
 * the money did arrive.
 *
 * Both projections carry the same shape — a level, and a slope that is either
 * the fitted one or zero:
 *   trend: the annual run rate keeps climbing at the fitted slope
 *   flat:  the annual run rate stays where the line says it is now
 *
 * @param {Array<object>} monthly
 * @param {Date} today
 * @param {Array<{date: Date, amount: number, membership?: string}>} payments
 *        Needed only for trailingYear, which is day-exact rather than by month.
 * @param {Object<string, object>} membershipsById
 */
export const forecast = ({ monthly, today, payments = [], membershipsById = {} }) => {
  const currentMonth = monthKey(today);
  const complete = monthly.filter((m) => m.month !== currentMonth);
  const rolling = rollingTwelve(complete);

  const yearAgo = new Date(today);
  yearAgo.setFullYear(yearAgo.getFullYear() - 1);
  const trailingYear = payments.reduce((sum, p) => {
    if (!p.membership || !membershipsById[p.membership]) return sum;
    return p.date > yearAgo && p.date <= today ? sum + p.amount : sum;
  }, 0);

  if (rolling.length === 0) {
    return { trailingYear, level: 0, slope: 0, fitMonths: 0, years: [] };
  }

  // x in months, 0 at the last complete month, so `level` reads straight off the
  // intercept and `slope` is the change in annual run rate per month.
  const window = rolling.slice(-12);
  const lastMonth = rolling[rolling.length - 1].month;
  const fit = linearFit(window.map((p) => ({ x: monthDiff(lastMonth, p.month), y: p.total })));
  const level = fit.at(0);
  const slope = fit.slope;

  const rateAt = (month, useSlope) =>
    Math.max(0, level + (useSlope ? slope * monthDiff(lastMonth, month) : 0)) / 12;

  const thisYear = today.getFullYear();
  const actualThisYear = monthly
    .filter((m) => Number(m.month.split('-')[0]) === thisYear)
    .reduce((sum, m) => sum + m.total, 0);

  // The rest of the current month, pro rata on days — without it every
  // year-to-date projection is short by most of a month.
  const elapsed = today.getDate() / daysInMonth(currentMonth);

  const project = (year, useSlope) => {
    if (year === thisYear) {
      let rest = rateAt(currentMonth, useSlope) * (1 - elapsed);
      for (let m = today.getMonth() + 2; m <= 12; m++) {
        rest += rateAt(`${year}-${String(m).padStart(2, '0')}`, useSlope);
      }
      return { actual: actualThisYear, projected: rest, total: actualThisYear + rest };
    }
    let total = 0;
    for (let m = 1; m <= 12; m++) {
      total += rateAt(`${year}-${String(m).padStart(2, '0')}`, useSlope);
    }
    return { actual: 0, projected: total, total };
  };

  return {
    trailingYear,
    level,
    slope,
    fitMonths: window.length,
    lastCompleteMonth: lastMonth,
    years: [thisYear, thisYear + 1].map((year) => ({
      year,
      trend: project(year, true),
      flat: project(year, false),
    })),
  };
};

/**
 * What the graph leaves out, so nobody reads it as the association's whole
 * income. Counted from the same payment array the series is built from.
 *
 * @param {Array<object>} payments
 * @param {Object<string, object>} membershipsById
 */
export const excludedSummary = (payments, membershipsById) => {
  const bucket = () => ({ count: 0, sum: 0 });
  const out = {
    other: bucket(),
    storePurchase: bucket(),
    unclassified: bucket(),
    danglingMembership: bucket(),
  };
  payments.forEach((p) => {
    let key = null;
    if (p.membership) {
      if (!membershipsById[p.membership]) key = 'danglingMembership';
    } else if (p.storeItem) key = 'storePurchase';
    else if (p.other) key = 'other';
    else key = 'unclassified';
    if (!key) return;
    out[key].count += 1;
    out[key].sum += p.amount;
  });
  return out;
};
