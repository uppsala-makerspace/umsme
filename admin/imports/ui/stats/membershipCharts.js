import { CHURN_GRACE_MONTHS } from '/imports/stats/churn';

/**
 * The membership statistics as Chart.js configurations, as the Blaze page
 * drew them, from what stats.memberships returns.
 */

const line = (label, data, colour, stepped = true) => ({
  label, data, borderWidth: 2, borderColor: colour, fill: false, cubicInterpolationMode: 'monotone', ...(stepped ? { steppedLine: 'before' } : {}),
});
const area = (label, data, border, background) => ({ label, data, borderWidth: 2, borderColor: border, backgroundColor: background, fill: true });
const stackedBar = (labels, datasets) => ({
  type: 'bar',
  data: { labels, datasets },
  options: { responsive: true, scales: { x: { stacked: true }, y: { stacked: true, ticks: { beginAtZero: true } } } },
});

const CHURN = 'rgb(255, 99, 132)';
const YEAR = 'rgb(150, 0, 30)';

/** Writes the year and its churn above each calendar year's point. */
const yearLabels = (churn) => ({
  id: 'churnYearLabels',
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    const points = chart.getDatasetMeta(0).data;
    ctx.save();
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = YEAR;
    ctx.textAlign = 'center';
    churn.year.forEach((year, i) => {
      if (year && points[i]) ctx.fillText(`${year}: ${churn.percent[i]} %`, points[i].x, points[i].y - 14);
    });
    ctx.restore();
  },
});

/**
 * Churn over the last year, month by month, as a line; the tooltip tells
 * how many of how many. The Decembers' points, a whole calendar year each,
 * stand out and carry the year.
 */
const churnChart = (churn) => ({
  type: 'line',
  data: {
    labels: churn.labels,
    datasets: [{
      label: 'Members a year ago who have not renewed since (%)', data: churn.percent,
      borderWidth: 2, borderColor: CHURN, backgroundColor: 'rgba(255, 99, 132, 0.2)', fill: true, tension: 0.3,
      pointRadius: churn.year.map((y) => (y ? 7 : 2)),
      pointHoverRadius: churn.year.map((y) => (y ? 9 : 4)),
      pointStyle: churn.year.map((y) => (y ? 'rectRot' : 'circle')),
      pointBackgroundColor: churn.year.map((y) => (y ? YEAR : CHURN)),
      pointBorderColor: churn.year.map((y) => (y ? YEAR : CHURN)),
    }],
  },
  plugins: [yearLabels(churn)],
  options: {
    responsive: true,
    layout: { padding: { top: 24 } },
    scales: { y: { beginAtZero: true, grace: '10%', ticks: { callback: (v) => `${v} %` } } },
    plugins: {
      tooltip: {
        callbacks: {
          title: ([{ dataIndex }]) => (churn.year[dataIndex] ? `The year ${churn.year[dataIndex]}` : churn.labels[dataIndex]),
          label: ({ dataIndex }) => `${churn.percent[dataIndex]} %: ${churn.lost[dataIndex]} of ${churn.base[dataIndex]} members`,
        },
      },
    },
  },
});

export const membershipCharts = ({ series, monthly, churn }) => [
  {
    label: 'Members per day',
    config: {
      type: 'line',
      data: {
        datasets: [
          line('All members', series.members, 'rgb(0, 0, 0)', false),
          line('No lab', series.individual, 'rgb(255, 99, 132)'),
          line('Lab', series.individualLab, 'rgb(54, 162, 235)'),
          line('No lab - family', series.family, 'rgb(255, 206, 86)'),
          line('Lab - family', series.familyLab, 'rgb(75, 192, 192)'),
        ],
      },
      options: {
        responsive: true,
        scales: {
          y: { stacked: false, ticks: { beginAtZero: true, stepSize: 1 } },
          x: { type: 'time', time: { displayFormats: { quarter: 'MMM YYYY' } } },
        },
      },
    },
  },
  {
    label: 'Members per month',
    config: stackedBar(monthly.labels, [
      area('Members renewing', monthly.renewed, 'rgb(0,0,0)', 'rgb(133,133,133)'),
      area('Members pausing', monthly.disappeared, 'rgb(255,156,0)', 'rgb(255,201,129)'),
      area('Members rejoining', monthly.rejoined, 'rgb(41,148,0)', 'rgb(138,210,122)'),
      area('Gained members', monthly.joined, 'rgba(75, 192, 192)', 'rgba(75, 192, 192, 0.2)'),
      area('Lost members', monthly.left, 'rgba(255, 99, 132)', 'rgba(255, 99, 132, 0.2)'),
    ]),
  },
  {
    label: 'Churn over the last year',
    note: `For each month: of the paying members a year earlier (a family counts once), the share who have not renewed since. The marked points, each December's, are whole calendar years. Renewing up to ${CHURN_GRACE_MONTHS} months late is not leaving, so the last ${CHURN_GRACE_MONTHS} months, whose late renewals are not known yet, are not shown.`,
    config: churnChart(churn),
  },
  {
    label: 'Time to renew',
    config: stackedBar(monthly.renewLabels, [area('Time it takes for members to renew', monthly.renewTime, 'rgb(0,0,0)', 'rgb(133,133,133)')]),
  },
  {
    label: 'Years as a member',
    config: stackedBar(monthly.memberAgeLabels, [
      area('Number of years current members have been active', monthly.memberAge, 'rgb(41,148,0)', 'rgb(138,210,122)'),
      area('Number of years members that has left has been active', monthly.memberAgeLeft, 'rgb(252,0,0)', 'rgb(242,215,202)'),
    ]),
  },
];
