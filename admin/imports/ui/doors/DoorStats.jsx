import React, { useMemo } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { ChartCanvas } from '../components/ChartCanvas';
import { monthLabel, monthName, quarterLabel, quarterName, dayLabel } from '../periods';

const VIEWS = { day: 'Per day', month: 'Per month', quarter: 'Per quarter', year: 'Per year' };
const UNITS = { day: 'day', month: 'month', quarter: 'quarter', year: 'year' };
const COUNTS = { visits: 'Visits', unique: 'Unique members' };

const number = (n) => n.toLocaleString('sv-SE');
// An average to one decimal below ten ("2,4"), whole above ("450").
const average = (n) => n.toLocaleString('sv-SE', { maximumFractionDigits: n < 10 ? 1 : 0 });
const AVERAGE_OF = { visits: 'visits', unique: 'unique member visits' };

const barLabel = (view, key, index) => ({
  day: () => dayLabel(key),
  month: () => monthLabel(key, index),
  quarter: () => quarterLabel(key, index),
  year: () => key,
}[view]());

/** The query a bar opens, one step down: a year or quarter by month, a month by day. */
const drillDown = (view, key) => ({
  month: { view: 'day', month: key },
  quarter: { view: 'month', year: Number(key.slice(0, 4)) },
  year: { view: 'month', year: Number(key) },
}[view]);

/** The average visits per weekday, Monday first, over the month's or the year's days. */
const WeekdayChart = ({ stats }) => {
  const config = useMemo(() => ({
    type: 'bar',
    data: {
      labels: stats.weekdays.map((w) => w.weekday),
      datasets: [{ label: 'Average visits', data: stats.weekdays.map((w) => Math.round(w.average * 10) / 10), borderWidth: 2 }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } },
    },
  }), [stats.weekdays]);
  const days = stats.weekdays.reduce((sum, w) => sum + w.days, 0);
  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h6" component="h2">Average visits per weekday</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Over the {days} days of {stats.view === 'day' ? monthName(stats.month) : stats.year}
        {' '}shown, days without visits included.
      </Typography>
      <ChartCanvas config={config} label="Average visits per weekday" height={240} />
    </Box>
  );
};

/** What the chart shows, in words: "October 2026", "2026", "Q2 2026 – Q4 2026". */
const periodName = (stats) => {
  const { view, bars } = stats;
  if (view === 'day') return monthName(stats.month);
  if (view === 'month') return String(stats.year);
  if (!bars.length) return '';
  const name = view === 'quarter' ? quarterName : (key) => key;
  const first = name(bars[0].key);
  const last = name(bars[bars.length - 1].key);
  return first === last ? first : `${first} – ${last}`;
};

/**
 * The door visits of the whole association: a visit is a day a member opened
 * any door, at most one a day per member. Per day of a month, or per month of
 * a year, per quarter or per year, counting visits or unique members (each
 * member once per bar). A bar opens the period below it.
 *
 * @param {{ stats?: { view, month?, year?, bars: {key, visits, unique}[], total: {visits, unique},
 *   average: {visits, unique, over}, weekdays?: {weekday, days, visits, average}[],
 *   available: { months: string[], years: number[] } },
 *   query: { view: 'day'|'month'|'quarter'|'year', month?: string, year?: number },
 *   onQuery: (query) => void, count: 'visits'|'unique', onCount: (count) => void,
 *   loading?: boolean, error?: string }} props
 *   `stats` as doorStats.visits returns it; an older one stays shown while `loading`.
 */
export const DoorStats = ({ stats, query, onQuery, count, onCount, loading = false, error }) => {
  const view = stats?.view || query.view;
  const measure = view === 'day' ? 'visits' : count;
  const config = useMemo(() => stats && ({
    type: 'bar',
    data: {
      labels: stats.bars.map((b, i) => barLabel(stats.view, b.key, i)),
      datasets: [{
        label: COUNTS[measure],
        data: stats.bars.map((b) => b[measure]),
        // No colours of our own: Chart.js's default palette (its Colors plugin).
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
      ...(stats.view === 'day' ? {} : {
        onClick: (event, elements) => {
          if (elements.length) onQuery(drillDown(stats.view, stats.bars[elements[0].index].key));
        },
        onHover: (event, elements) => { event.native.target.style.cursor = elements.length ? 'pointer' : 'default'; },
      }),
    },
  }), [stats, measure]);

  const months = stats?.available.months || [];
  const years = stats?.available.years || [];
  return (
    <Box>
      <Typography variant="h4" component="h1" sx={{ mb: 1 }}>Door visits</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        A visit is a day a member opened any door: at most one a day per member.
        {view !== 'day' && ' Unique members counts each member once per bar.'}
      </Typography>

      <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
        <ToggleButtonGroup exclusive size="small" value={query.view} aria-label="View"
          onChange={(e, next) => next && onQuery({ view: next })}>
          {Object.entries(VIEWS).map(([value, label]) => <ToggleButton key={value} value={value}>{label}</ToggleButton>)}
        </ToggleButtonGroup>
        {query.view === 'day' && months.length > 0 && (
          <TextField select size="small" label="Month" sx={{ minWidth: 180 }}
            value={query.month || stats?.month || months[0]}
            onChange={(e) => onQuery({ view: 'day', month: e.target.value })}>
            {months.map((m) => <MenuItem key={m} value={m}>{monthName(m)}</MenuItem>)}
          </TextField>
        )}
        {query.view === 'month' && years.length > 0 && (
          <TextField select size="small" label="Year" sx={{ minWidth: 120 }}
            value={query.year || stats?.year || years[0]}
            onChange={(e) => onQuery({ view: 'month', year: Number(e.target.value) })}>
            {years.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
          </TextField>
        )}
        {query.view !== 'day' && (
          <ToggleButtonGroup exclusive size="small" value={count} aria-label="Count"
            onChange={(e, next) => next && onCount(next)}>
            {Object.entries(COUNTS).map(([value, label]) => <ToggleButton key={value} value={value}>{label}</ToggleButton>)}
          </ToggleButtonGroup>
        )}
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {!stats && loading && <Typography color="text.secondary">Counting…</Typography>}
      {stats && (
        <>
          <Typography variant="body1" sx={{ mb: 1 }}>
            <strong>{periodName(stats)}:</strong>{' '}
            {`${number(stats.total.visits)} ${stats.total.visits === 1 ? 'visit' : 'visits'} by ${number(stats.total.unique)} ${stats.total.unique === 1 ? 'member' : 'members'}`}
            {/* An average per day or per month; per quarter or year it says little. */}
            {['day', 'month'].includes(stats.view) && stats.average?.over > 0
              && `, on average ${average(stats.average[measure])} ${AVERAGE_OF[measure]} per ${UNITS[stats.view]}`}
          </Typography>
          {stats.total.visits === 0 ? (
            <Typography color="text.secondary">No visits in {periodName(stats) || 'this period'}.</Typography>
          ) : (
            <>
              <ChartCanvas config={config} label={`${COUNTS[measure]} per ${UNITS[stats.view]}`} />
              {stats.view !== 'day' && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Click a bar to see it {stats.view === 'month' ? 'by day' : 'by month'}.
                </Typography>
              )}
              {stats.weekdays && <WeekdayChart stats={stats} />}
            </>
          )}
        </>
      )}
    </Box>
  );
};
