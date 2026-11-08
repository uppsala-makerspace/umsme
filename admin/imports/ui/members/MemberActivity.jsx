import React, { useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import { TabPart, TabToolbar } from '../components/PageTabs';
import { ChartCanvas } from '../components/ChartCanvas';
import { dateTime } from '../dates';

/** lastSeenAt has been recorded since this month; before, app use is not known. */
export const APP_USE_RECORDED_SINCE = '2026-11';

const METHODS = { app: 'via the app', danalock: 'via Danalock' };

/** "Nov", with the year on the first bar and on January: "Dec 2025", "Jan 2026". */
const monthLabel = (key, index) => {
  const [year, month] = key.split('-').map(Number);
  const name = new Date(Date.UTC(year, month - 1, 15)).toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' });
  return index === 0 || month === 1 ? `${name} ${year}` : name;
};

const Line = ({ label, children, muted }) => (
  <Typography variant="body2" color={muted ? 'text.secondary' : undefined} sx={{ mb: 0.5 }}>
    {label && <strong>{label}: </strong>}{children}
  </Typography>
);

const AppPart = ({ app }) => (
  <TabPart title="App">
    {!app.hasAccount ? (
      <Line muted>Has no app account.</Line>
    ) : app.lastSeenAt ? (
      <Line label="Last used the app">{dateTime(app.lastSeenAt)}</Line>
    ) : (
      <>
        <Line label="Last used the app">Never</Line>
        <Line muted>Recorded since {APP_USE_RECORDED_SINCE}; earlier use is not known.</Line>
      </>
    )}
  </TabPart>
);

/** Whose openings: the member's (the default) or the whole family's. Only offered in a family. */
const ScopeChoice = ({ scope, family, busy, onScope }) => (
  <ToggleButtonGroup exclusive size="small" value={scope} disabled={busy} aria-label="Whose door openings"
    onChange={(e, next) => next && onScope(next)}>
    <ToggleButton value="member">This member</ToggleButton>
    <ToggleButton value="family">Whole family ({family.length})</ToggleButton>
  </ToggleButtonGroup>
);

/** What the chart counts: every opening, or visits (days someone opened any door). */
const MEASURES = {
  openings: { label: 'Openings', chart: 'Door openings per month', one: 'opening', many: 'openings' },
  visits: { label: 'Visits', chart: 'Visits per month', one: 'visit', many: 'visits' },
};

const MeasureChoice = ({ measure, onMeasure }) => (
  <ToggleButtonGroup exclusive size="small" value={measure} aria-label="What to count"
    onChange={(e, next) => next && onMeasure(next)}>
    {Object.entries(MEASURES).map(([value, { label }]) => <ToggleButton key={value} value={value}>{label}</ToggleButton>)}
  </ToggleButtonGroup>
);

const counted = (n, measure) => `${n} ${n === 1 ? MEASURES[measure].one : MEASURES[measure].many}`;

/** "November 2026". */
const monthName = (key) => {
  const [year, month] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, 15)).toLocaleString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
};

/** The days of a month, "2026-02-01" …, with what `days` has for each, else 0. */
const daysOf = (monthKey, days) => {
  const [year, month] = monthKey.split('-').map(Number);
  const count = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const known = Object.fromEntries(days.filter((d) => d.day.startsWith(`${monthKey}-`)).map((d) => [d.day, d]));
  return Array.from({ length: count }, (_, i) => {
    const day = `${monthKey}-${String(i + 1).padStart(2, '0')}`;
    return { day, label: String(i + 1), openings: known[day]?.openings || 0, visits: known[day]?.visits || 0 };
  });
};

/** Which period the chart shows: the last twelve months, or one of them by day. */
const PeriodChoice = ({ months, month, onMonth }) => (
  <TextField select size="small" label="Period" value={month || ''} sx={{ minWidth: 190 }}
    onChange={(e) => onMonth(e.target.value || null)}
    SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }}>
    <MenuItem value="">Last 12 months</MenuItem>
    {[...months].reverse().map((m) => <MenuItem key={m.month} value={m.month}>{monthName(m.month)}</MenuItem>)}
  </TextField>
);

const DoorsPart = ({ doors, scope, family, busy, onScope }) => {
  const [measure, setMeasure] = useState('openings');
  // null: the last twelve months, by month; else one month ("2026-02"), by day.
  const [month, setMonth] = useState(null);
  const bars = useMemo(() => (month
    ? daysOf(month, doors.days)
    : doors.months.map((m, i) => ({ ...m, label: monthLabel(m.month, i) }))), [doors, month]);
  const config = useMemo(() => ({
    type: 'bar',
    data: {
      labels: bars.map((b) => b.label),
      datasets: [{
        label: MEASURES[measure].label,
        data: bars.map((b) => b[measure]),
        borderWidth: 2,
        borderColor: 'rgba(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
      // A month's bar opens that month, by day.
      ...(month ? {} : {
        onClick: (event, elements) => { if (elements.length) setMonth(doors.months[elements[0].index].month); },
        onHover: (event, elements) => { event.native.target.style.cursor = elements.length ? 'pointer' : 'default'; },
      }),
    },
  }), [bars, measure, month, doors.months]);

  const last = doors.lastUnlock;
  const inFamily = family.length > 1;
  // In the family's view, whose the latest opening was.
  const by = scope === 'family' && last ? family.find((m) => m._id === last.memberid)?.name : null;
  const period = month ? monthName(month) : 'Last 12 months';
  const shown = month ? doors.months.find((m) => m.month === month) : doors.total;
  const chartLabel = month ? `${MEASURES[measure].label} per day, ${period}` : MEASURES[measure].chart;
  return (
    <TabPart title="Doors" actions={(
      <>
        {inFamily && onScope && <ScopeChoice scope={scope} family={family} busy={busy} onScope={onScope} />}
        <MeasureChoice measure={measure} onMeasure={setMeasure} />
        <PeriodChoice months={doors.months} month={month} onMonth={setMonth} />
      </>
    )}>
      <Line label="Last opened">
        {last ? `${dateTime(last.timestamp)}, ${last.door}, ${METHODS[last.method] || last.method}${by ? `, by ${by}` : ''}` : 'Never'}
      </Line>
      <Line label={period}>
        {`${counted(shown.openings, 'openings')}, ${counted(shown.visits, 'visits')}`}
      </Line>
      <Line muted>A visit is a day {scope === 'family' ? 'a family member' : 'the member'} opened any door: at most one a day{scope === 'family' ? ' per person' : ''}.</Line>
      {shown.openings === 0 ? (
        <Line muted>No openings in {month ? period : 'the last 12 months'}.</Line>
      ) : (
        <Box sx={{ mt: 1 }}>
          <ChartCanvas config={config} label={chartLabel} height={220} />
          {month ? (
            <Line muted>Click “Last 12 months” under Period to go back.</Line>
          ) : (
            <>
              <Line muted>Click a month to see it by day.</Line>
              {doors.byDoor.length > 1 && (
                <Line muted>Openings per door: {doors.byDoor.map((d) => `${d.door} ${d.count}`).join(' · ')}</Line>
              )}
            </>
          )}
        </Box>
      )}
    </TabPart>
  );
};

/**
 * The Activity tab of a member's page: what the member has done, one part per
 * kind of activity (the app, the doors). A new kind is a new part here and a
 * new key in common/server/members/activity.js. The doors can be shown for
 * the whole family instead of the member alone, when the member is in one,
 * charted as openings or as visits (days with an opening), and for the last
 * twelve months by month or for one of them by day.
 *
 * @param {{ activity?: { scope: 'member'|'family', family: {_id, name}[],
 *   app: { hasAccount: boolean, lastSeenAt: Date|null },
 *   doors: { lastUnlock: object|null, total: { openings, visits },
 *     months: {month, openings, visits}[], days: {day, openings, visits}[], byDoor: {door, count}[] } },
 *   loading?: boolean, error?: string, onScope?: (scope) => void }} props
 *   `loading` while (re)fetching; an activity already there stays shown meanwhile.
 */
export const MemberActivity = ({ activity, loading = false, error, onScope }) => (
  <Box component="section" aria-label="Activity">
    <TabToolbar note="When the member last used the app and opened a door." />
    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
    {loading && !activity && <Typography color="text.secondary">Loading…</Typography>}
    {activity && (
      <>
        <AppPart app={activity.app} />
        <DoorsPart doors={activity.doors} scope={activity.scope} family={activity.family}
          busy={loading} onScope={onScope} />
      </>
    )}
  </Box>
);
