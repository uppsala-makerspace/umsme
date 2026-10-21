import { CATEGORIES, CATEGORY_LABELS, backtest } from '/imports/stats/revenueSeries';

/**
 * The revenue page's rows and figures from the model stats.revenue returns,
 * as the Blaze page's helpers made them.
 */

export const kr = (n) => `${Math.round(n || 0).toLocaleString('sv-SE')} kr`;
export const signedKr = (n) => `${n >= 0 ? '+' : '−'}${kr(Math.abs(n))}`;
export const percentText = (p) => `${p >= 0 ? '+' : '−'}${Math.round(Math.abs(p) * 100)}%`;
/** 'up', 'down' or '' for a change. */
export const direction = (n) => (n > 0 ? 'up' : n < 0 ? 'down' : '');

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
/** "2019-10" as "October": the year is already beside it. */
const monthName = (key) => MONTH_NAMES[Number(key.split('-')[1]) - 1];

export const categories = CATEGORIES.map((c) => ({ key: c, label: CATEGORY_LABELS[c] }));

export const summary = (model) => {
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
};

export const yearlyRows = (model) => model.yearly.slice().reverse().map((row) => ({
  year: row.year,
  incomplete: row.partial,
  amounts: CATEGORIES.map((c) => row.byCategory[c]),
  total: row.total,
  // The stub first year, labelled so the next year's percentage is not read as ordinary growth.
  coversFrom: row.startsMidYear && !row.partial ? monthName(row.coversFrom) : '',
  growth: row.growth,
  growthTitle: row.growth === null ? ''
    : row.partial ? `${kr(row.comparedTo)} against ${kr(row.comparedFrom)} for the same months last year`
      : row.baseIsPartial ? `Against ${row.year - 1}, which the records only cover part of` : '',
}));

export const yearOverYearRows = (model) => model.yoy.slice().reverse();

/** How far a forecast sat from what happened: "25% low" rather than a bare signed number. */
const miss = (forecast, actual) => {
  if (!actual || !forecast) return '';
  const off = Math.round(Math.abs((forecast - actual) / actual) * 100);
  if (off === 0) return 'spot on';
  return `${off}% ${forecast < actual ? 'low' : 'high'}`;
};

/**
 * Every year on record plus the next one, newest first: what was forecast
 * and what happened. A finished year is forecast from the end of the year
 * before, so the model never sees the year it predicts; the years ahead use
 * everything known today.
 */
export const forecastRows = (model) => {
  const live = model.forecast;
  const actuals = Object.fromEntries(model.yearly.map((y) => [y.year, y]));
  const years = [...new Set([...model.yearly.map((y) => y.year), ...live.years.map((y) => y.year)])].sort((a, b) => b - a);
  return years.map((year) => {
    const row = actuals[year];
    const liveRow = live.years.find((y) => y.year === year);
    const partial = !!row && row.partial;
    const grew = row && row.growthPerMonth !== null && row.growthPerMonth !== undefined;
    const common = {
      year,
      actual: row ? row.total : null,
      partial,
      perMonth: row && row.months ? row.perMonth : null,
      perMonthTitle: row && row.months !== 12 ? `over the ${row.months} months on record` : '',
      actualGrowth: grew ? row.growthPerMonth : null,
      actualGrowthTitle: grew && partial ? `${year} against the same months of ${year - 1}` : '',
    };
    if (liveRow) {
      return { ...common, madeAt: `today (${live.lastCompleteMonth})`, slope: live.slope, trend: liveRow.trend.total, flat: liveRow.flat.total, trendMiss: '', flatMiss: '' };
    }
    const back = backtest(model.monthly, year);
    return {
      ...common,
      madeAt: back ? back.madeAt : '',
      slope: back ? back.slope : null,
      trend: back ? back.trend : null,
      flat: back ? back.flat : null,
      trendMiss: back ? miss(back.trend, row && row.total) : '',
      flatMiss: back ? miss(back.flat, row && row.total) : '',
    };
  });
};

const EXCLUDED_LABELS = {
  other: 'other purposes',
  storePurchase: 'webshop purchases',
  unclassified: 'unclassified',
  danglingMembership: 'broken membership link',
};

export const excludedItems = (model) => Object.entries(model.excluded)
  .filter(([, v]) => v.count > 0)
  .map(([key, v]) => ({ label: EXCLUDED_LABELS[key], count: v.count, sum: v.sum }));

const CATEGORY_COLOURS = {
  member: 'rgb(255, 206, 86)',
  family: 'rgb(255, 159, 64)',
  lab: 'rgb(54, 162, 235)',
  familyLab: 'rgb(75, 192, 192)',
  quarterlyLab: 'rgb(153, 102, 255)',
};

/** The two charts: revenue per month by category with the trailing year, and the last twelve months against the year before. */
export const revenueCharts = (model) => {
  const { monthly, rolling, yoy } = model;
  if (!monthly.length) return [];
  const rollingByMonth = Object.fromEntries(rolling.map((r) => [r.month, r.total]));
  const money = { ticks: { callback: (v) => kr(v) } };
  return [
    {
      label: 'Revenue per month',
      config: {
        data: {
          labels: monthly.map((m) => m.month),
          datasets: [
            ...CATEGORIES.map((category) => ({
              type: 'bar', label: CATEGORY_LABELS[category], data: monthly.map((m) => m.byCategory[category]),
              backgroundColor: CATEGORY_COLOURS[category], stack: 'revenue', yAxisID: 'y',
            })),
            {
              type: 'line', label: 'Trailing twelve months', data: monthly.map((m) => rollingByMonth[m.month] ?? null),
              borderColor: 'rgb(0, 0, 0)', borderWidth: 2, pointRadius: 0, fill: false, yAxisID: 'y1',
            },
          ],
        },
        options: {
          responsive: true,
          interaction: { mode: 'index', intersect: false },
          scales: {
            x: { stacked: true },
            y: { stacked: true, beginAtZero: true, title: { display: true, text: 'Per month' }, ...money },
            y1: { position: 'right', beginAtZero: true, grid: { drawOnChartArea: false }, title: { display: true, text: 'Trailing twelve months' }, ...money },
          },
          plugins: { tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${kr(c.parsed.y)}` } } },
        },
      },
    },
    {
      label: 'Revenue against the year before',
      config: {
        type: 'bar',
        data: {
          labels: yoy.map((r) => r.month),
          datasets: [
            { label: 'Year before', data: yoy.map((r) => r.previousYear), backgroundColor: 'rgb(190, 190, 190)' },
            { label: 'This period', data: yoy.map((r) => r.total), backgroundColor: 'rgb(54, 162, 235)' },
          ],
        },
        options: {
          responsive: true,
          scales: { y: { beginAtZero: true, ...money } },
          plugins: {
            tooltip: {
              callbacks: {
                label: (c) => `${c.dataset.label}: ${kr(c.parsed.y)}`,
                // The comparison is the point of this chart, so state it.
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
      },
    },
  ];
};
