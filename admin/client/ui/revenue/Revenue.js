import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import Chart from 'chart.js/auto';
import { Payments } from '/imports/common/collections/payments.js';
import { Memberships } from '/imports/common/collections/memberships.js';
import {
  CATEGORIES,
  CATEGORY_LABELS,
  monthlySeries,
  yearlyGrowth,
  backtest,
  rollingTwelve,
  yearOverYear,
  forecast,
  excludedSummary,
} from '/imports/stats/revenueSeries';
import './Revenue.html';
import './revenueStyle.css';

/**
 * Membership revenue: where it has been, and where the trend points.
 *
 * Everything is derived in the browser from two subscriptions, the same way the
 * membership statistics page works. The arithmetic lives in
 * imports/stats/revenueSeries.js so it can be unit tested; this file only fetches,
 * draws and formats.
 */

const CATEGORY_COLOURS = {
  member: 'rgb(255, 206, 86)',
  family: 'rgb(255, 159, 64)',
  lab: 'rgb(54, 162, 235)',
  familyLab: 'rgb(75, 192, 192)',
  quarterlyLab: 'rgb(153, 102, 255)',
};

const kr = (n) => `${Math.round(n || 0).toLocaleString('sv-SE')} kr`;

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

/** "2019-10" as "October" — the year is already in the cell next to it. */
const monthName = (key) => MONTH_NAMES[Number(key.split('-')[1]) - 1];

let monthChart;
let yoyChart;

const destroyCharts = () => {
  if (monthChart) { monthChart.destroy(); monthChart = undefined; }
  if (yoyChart) { yoyChart.destroy(); yoyChart = undefined; }
};

/** One fetch, then everything is derived from plain arrays. */
const computeModel = () => {
  const payments = Payments.find({}, { fields: { date: 1, amount: 1, membership: 1, other: 1, storeItem: 1 } }).fetch();
  const membershipsById = Object.fromEntries(
    Memberships.find({}, { fields: { type: 1, family: 1, start: 1, labend: 1 } })
      .fetch()
      .map((m) => [m._id, m]),
  );
  const today = new Date();
  const monthly = monthlySeries(payments, membershipsById);
  return {
    today,
    monthly,
    rolling: rollingTwelve(monthly),
    yearly: yearlyGrowth(monthly, today),
    yoy: yearOverYear(monthly, today),
    forecast: forecast({ monthly, today, payments, membershipsById }),
    excluded: excludedSummary(payments, membershipsById),
  };
};

const drawCharts = (model) => {
  destroyCharts();
  const { monthly, rolling } = model;
  if (monthly.length === 0) return;

  const rollingByMonth = Object.fromEntries(rolling.map((r) => [r.month, r.total]));

  monthChart = new Chart('revenuePerMonth', {
    data: {
      labels: monthly.map((m) => m.month),
      datasets: [
        ...CATEGORIES.map((category) => ({
          type: 'bar',
          label: CATEGORY_LABELS[category],
          data: monthly.map((m) => m.byCategory[category]),
          backgroundColor: CATEGORY_COLOURS[category],
          stack: 'revenue',
          yAxisID: 'y',
        })),
        {
          type: 'line',
          label: 'Trailing twelve months',
          data: monthly.map((m) => rollingByMonth[m.month] ?? null),
          borderColor: 'rgb(0, 0, 0)',
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
          yAxisID: 'y1',
        },
      ],
    },
    options: {
      responsive: true,
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: { stacked: true },
        y: {
          stacked: true,
          beginAtZero: true,
          title: { display: true, text: 'Per month' },
          ticks: { callback: (v) => kr(v) },
        },
        y1: {
          position: 'right',
          beginAtZero: true,
          grid: { drawOnChartArea: false },
          title: { display: true, text: 'Trailing twelve months' },
          ticks: { callback: (v) => kr(v) },
        },
      },
      plugins: {
        tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${kr(c.parsed.y)}` } },
      },
    },
  });

  const { yoy } = model;
  yoyChart = new Chart('revenueYearOverYear', {
    type: 'bar',
    data: {
      labels: yoy.map((r) => r.month),
      datasets: [
        {
          label: 'Year before',
          data: yoy.map((r) => r.previousYear),
          backgroundColor: 'rgb(190, 190, 190)',
        },
        {
          label: 'This period',
          data: yoy.map((r) => r.total),
          backgroundColor: 'rgb(54, 162, 235)',
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true, ticks: { callback: (v) => kr(v) } },
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: (c) => `${c.dataset.label}: ${kr(c.parsed.y)}`,
            // The comparison is the point of this chart, so state it rather than
            // leaving it to be measured by eye.
            afterBody: (items) => {
              const row = yoy[items[0].dataIndex];
              if (row.previousYear === null) return 'No data a year earlier';
              const pct = row.percent === null ? '' : ` (${row.percent >= 0 ? '+' : ''}${Math.round(row.percent * 100)}%)`;
              return `Change: ${row.diff >= 0 ? '+' : ''}${kr(row.diff)}${pct}`;
            },
          },
        },
      },
    },
  });
};

Template.Revenue.onCreated(function () {
  this.model = new ReactiveVar(null);
  this.subscribe('payments');
  this.subscribe('memberships');
});

Template.Revenue.onRendered(function () {
  this.autorun(() => {
    if (!this.subscriptionsReady()) return;
    const model = computeModel();
    this.model.set(model);
    // Defer so the canvases exist once the helpers above have rendered.
    Meteor.defer(() => drawCharts(model));
  });
});

Template.Revenue.onDestroyed(destroyCharts);

Template.Revenue.helpers({
  kr,
  signedKr: (n) => `${n >= 0 ? '+' : '−'}${kr(Math.abs(n))}`,
  signClass: (n) => (n > 0 ? 'revenue-up' : n < 0 ? 'revenue-down' : ''),
  percentText: (p) => `${p >= 0 ? '+' : '−'}${Math.round(Math.abs(p) * 100)}%`,
  categories: () => CATEGORIES.map((c) => ({ label: CATEGORY_LABELS[c] })),
  currentYear: () => new Date().getFullYear(),

  summary() {
    const model = Template.instance().model.get();
    if (!model) return {};
    const f = model.forecast;
    return {
      trailingYear: f.trailingYear,
      level: f.level,
      slope: f.slope,
      slopePerYear: f.slope * 12,
      fitMonths: f.fitMonths,
      lastCompleteMonth: f.lastCompleteMonth,
      firstMonth: model.monthly.length ? model.monthly[0].month : '',
    };
  },

  yearly() {
    const model = Template.instance().model.get();
    if (!model) return [];
    return model.yearly
      .slice()
      .reverse()
      .map((row) => ({
        year: row.year,
        incomplete: row.partial,
        amounts: CATEGORIES.map((c) => row.byCategory[c]),
        total: row.total,
        // The stub first year of the series, labelled so the next year's
        // percentage is not read as ordinary growth.
        coversFrom: row.startsMidYear && !row.partial ? monthName(row.coversFrom) : '',
        growth: row.growth,
        hasGrowth: row.growth !== null,
        // Spelled out where the plain reading of the two totals would mislead.
        growthTitle: row.growth === null
          ? ''
          : row.partial
          ? `${kr(row.comparedTo)} against ${kr(row.comparedFrom)} for the same months last year`
          : row.baseIsPartial
          ? `Against ${row.year - 1}, which the records only cover part of`
          : '',
      }));
  },

  yearOverYear() {
    const model = Template.instance().model.get();
    if (!model) return [];
    return model.yoy
      .slice()
      .reverse()
      .map((r) => ({ ...r, hasPrevious: r.previousYear !== null, hasPercent: r.percent !== null }));
  },

  /**
   * Every year the records touch plus the next one, newest first: what was
   * forecast, and what actually happened.
   *
   * A finished year is forecast from the end of the year before, so the model
   * never sees the year it predicts — otherwise "how good has the forecast
   * been" answers itself. The two years ahead use everything known today, which
   * is the forecast that is actually of use going forward.
   */
  forecastRows() {
    const model = Template.instance().model.get();
    if (!model) return [];
    const live = model.forecast;
    const actuals = Object.fromEntries(model.yearly.map((y) => [y.year, y]));
    const years = model.yearly.map((y) => y.year);
    const all = [...new Set([...years, ...live.years.map((y) => y.year)])].sort((a, b) => b - a);

    // How far the forecast sat from what happened, named in the direction that
    // reads without effort: "25% low" rather than a bare signed number.
    const miss = (forecast, actual) => {
      if (!actual || !forecast) return '';
      const off = Math.round(Math.abs((forecast - actual) / actual) * 100);
      if (off === 0) return 'spot on';
      return `${off}% ${forecast < actual ? 'low' : 'high'}`;
    };

    // Last year's revenue spread over the months it actually covers, as a scale
    // against which the trend per month next to it can be judged.
    const perMonthBefore = (year) => {
      const before = actuals[year - 1];
      if (!before || !before.months) return null;
      return { value: before.total / before.months, months: before.months, year: year - 1 };
    };

    return all.map((year) => {
      const row = actuals[year];
      const liveRow = live.years.find((y) => y.year === year);
      const partial = !!row && row.partial;
      const before = perMonthBefore(year);
      const beforeCell = {
        beforePerMonth: before ? before.value : null,
        hasBefore: !!before,
        // Named when it is not a whole year, so a small average is not read as
        // a bad year when it is simply a short one.
        beforeTitle: before && before.months !== 12
          ? `${before.year} over the ${before.months} months on record`
          : '',
      };
      if (liveRow) {
        return {
          year,
          madeAt: `today (${live.lastCompleteMonth})`,
          actual: row ? row.total : null,
          hasActual: !!row,
          partial,
          ...beforeCell,
          slope: live.slope,
          trend: liveRow.trend.total,
          flat: liveRow.flat.total,
          hasForecast: true,
          trendMiss: '',
          flatMiss: '',
        };
      }
      const back = backtest(model.monthly, year);
      return {
        year,
        madeAt: back ? back.madeAt : '',
        actual: row ? row.total : null,
        hasActual: !!row,
        partial,
        ...beforeCell,
        slope: back ? back.slope : null,
        trend: back ? back.trend : null,
        flat: back ? back.flat : null,
        hasForecast: !!back,
        trendMiss: back ? miss(back.trend, row && row.total) : '',
        flatMiss: back ? miss(back.flat, row && row.total) : '',
      };
    });
  },

  excluded() {
    const model = Template.instance().model.get();
    if (!model) return [];
    const labels = {
      other: 'other purposes',
      storePurchase: 'webshop purchases',
      unclassified: 'unclassified',
      danglingMembership: 'broken membership link',
    };
    return Object.entries(model.excluded)
      .filter(([, v]) => v.count > 0)
      .map(([key, v]) => ({ label: labels[key], count: v.count, sum: v.sum }));
  },
});
