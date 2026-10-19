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

export const membershipCharts = ({ series, monthly }) => [
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
    label: 'Churn',
    config: stackedBar(monthly.labels, [area('Percentage of lost members (churn)', monthly.churn, 'rgba(255, 99, 132)', 'rgba(255, 99, 132, 0.2)')]),
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
