import React, { useState } from 'react';
import { fn } from 'storybook/test';
import { DoorStats } from './DoorStats';

// Count can be switched in the story; view and period are fixed per story.
const WithCount = (args) => {
  const [count, setCount] = useState(args.count || 'visits');
  return <DoorStats {...args} count={count} onCount={setCount} />;
};

export default {
  title: 'Doors/DoorStats',
  component: DoorStats,
  render: (args) => <WithCount {...args} />,
  args: { onQuery: fn(), onCount: fn() },
};

const available = {
  months: ['2026-11', '2026-10', '2026-09', '2026-08', '2026-07', '2026-06', '2026-05', '2026-04', '2026-03', '2026-02', '2026-01', '2025-12', '2025-11'],
  years: [2026, 2025],
};

// Busier at the start of the week and on Saturdays' open workshops.
const dayCounts = [14, 9, 11, 12, 8, 21, 6, 15, 10, 9, 13, 7, 19, 5, 16, 11, 10, 12, 9, 23, 4, 13, 12, 8, 14, 6, 20, 7, 15, 11, 9];
const days = dayCounts.map((n, i) => ({ key: `2026-10-${String(i + 1).padStart(2, '0')}`, visits: n, unique: n }));
const sum = (bars, field) => bars.reduce((s, b) => s + b[field], 0);
// The average over the bars, without the last when it is the unfinished period.
const average = (bars, unfinished) => {
  const over = unfinished && bars.length > 1 ? bars.slice(0, -1) : bars;
  return { visits: sum(over, 'visits') / over.length, unique: sum(over, 'unique') / over.length, over: over.length };
};

// Average visits per weekday: Monday's and Saturday's open workshops busiest.
const weekdays = (scale) => [['Mon', 16], ['Tue', 9], ['Wed', 11], ['Thu', 10], ['Fri', 7], ['Sat', 18], ['Sun', 6]]
  .map(([weekday, avg]) => ({ weekday, days: scale, visits: Math.round(avg * scale), average: avg }));

// Average openings per hour: the evenings busiest, a few at night.
const hourCurve = [0.2, 0.1, 0, 0, 0, 0, 0.1, 0.4, 1.2, 2.1, 2.6, 2.4, 2.2, 2.5, 2.7, 3.1, 3.8, 4.6, 5.9, 6.4, 5.2, 3.4, 1.6, 0.6];
const hours = (days) => hourCurve.map((average, hour) => ({ hour, openings: Math.round(average * days), average }));

const months = [
  [260, 61], [301, 66], [288, 63], [312, 68], [275, 64], [240, 59], [198, 52], [221, 55], [296, 67], [334, 70], [104, 49],
].map(([visits, unique], i) => ({ key: `2026-${String(i + 1).padStart(2, '0')}`, visits, unique }));

const quarters = [['2025-Q4', 790, 88], ['2026-Q1', 849, 92], ['2026-Q2', 827, 90], ['2026-Q3', 715, 81], ['2026-Q4', 438, 77]]
  .map(([key, visits, unique]) => ({ key, visits, unique }));
const years = [['2025', 1040, 97], ['2026', 2829, 121]].map(([key, visits, unique]) => ({ key, visits, unique }));

export const PerDay = {
  args: {
    query: { view: 'day', month: '2026-10' },
    stats: { view: 'day', month: '2026-10', bars: days, total: { visits: sum(days, 'visits'), unique: 58 }, average: average(days), weekdays: weekdays(31 / 7), hours: hours(31), available },
  },
};

export const PerMonth = {
  args: {
    query: { view: 'month', year: 2026 },
    stats: { view: 'month', year: 2026, bars: months, total: { visits: sum(months, 'visits'), unique: 121 }, average: average(months, true), weekdays: weekdays(319 / 7), hours: hours(319), available },
  },
};

export const PerMonthUniqueMembers = { args: { ...PerMonth.args, count: 'unique' } };

export const PerQuarter = {
  args: {
    query: { view: 'quarter' },
    stats: { view: 'quarter', bars: quarters, total: { visits: sum(quarters, 'visits'), unique: 143 }, average: average(quarters, true), available },
  },
};

export const PerYear = {
  args: {
    query: { view: 'year' },
    stats: { view: 'year', bars: years, total: { visits: sum(years, 'visits'), unique: 143 }, average: average(years, true), available },
  },
};

export const NoVisits = {
  args: {
    query: { view: 'day', month: '2026-11' },
    stats: {
      view: 'day', month: '2026-11',
      bars: Array.from({ length: 8 }, (_, i) => ({ key: `2026-11-0${i + 1}`, visits: 0, unique: 0 })),
      total: { visits: 0, unique: 0 }, average: { visits: 0, unique: 0, over: 8 }, available,
    },
  },
};

export const Counting = { args: { query: { view: 'day' }, loading: true } };

export const WithError = { args: { query: { view: 'day' }, error: 'Not authorized' } };
