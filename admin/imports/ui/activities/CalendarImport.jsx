import React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { DataList } from '../components/DataList';
import { DateField } from '../components/DateField';
import { dateTime, day } from '../dates';
import { activityPath, eventPath } from './paths';

/**
 * Import the association's Google calendar as events: fetch what it has
 * between two days, choose, import. Each calendar event is imported once; one
 * with an activity's name becomes an event of it, the rest free-standing.
 * Nobody is told of an imported event.
 *
 * @param {{ configured: boolean|null, from: string, to: string, onFrom: (day) => void, onTo: (day) => void,
 *           onFetch: () => void, items: object[]|null, chosen: string[], onChoose: (ids: string[]) => void,
 *           onImport: () => void, busy?: boolean, error?: string, notice?: string }} props
 *   `items` are calendar.preview's, null before fetching; `chosen` their googleEventIds.
 */
export const CalendarImport = ({
  configured, from, to, onFrom, onTo, onFetch, items, chosen, onChoose, onImport, busy = false, error, notice,
}) => {
  const open = (items || []).filter((i) => !i.eventId);
  const toggle = (id, on) => onChoose(on ? [...chosen, id] : chosen.filter((c) => c !== id));
  const columns = [
    {
      field: 'choose', headerName: '', width: 60, sortable: false,
      renderHeader: () => (
        <Checkbox size="small" inputProps={{ 'aria-label': 'Choose all' }}
          checked={open.length > 0 && chosen.length === open.length}
          indeterminate={chosen.length > 0 && chosen.length < open.length}
          onChange={(e) => onChoose(e.target.checked ? open.map((i) => i.googleEventId) : [])} />
      ),
      renderCell: ({ row }) => (
        <Checkbox size="small" disabled={!!row.eventId} inputProps={{ 'aria-label': `Choose ${row.name}` }}
          checked={chosen.includes(row.googleEventId)} onChange={(e) => toggle(row.googleEventId, e.target.checked)} />
      ),
    },
    {
      field: 'start', headerName: 'Start', type: 'dateTime', width: 160,
      valueFormatter: (value, row) => (row.allDay ? `${day(value)} (all day)` : dateTime(value)),
    },
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 200 },
    { field: 'location', headerName: 'Location', width: 180 },
    {
      field: 'becomes', headerName: 'Becomes', width: 260, sortable: false,
      valueGetter: (value, row) => (row.eventId ? 'Imported' : row.activityId ? `An event of ${row.activityName?.sv}` : 'A free-standing event'),
      renderCell: ({ row, value }) => {
        if (row.eventId) return <Link href={eventPath(row.eventId)}>Imported</Link>;
        if (row.activityId) return <span>An event of <Link href={activityPath(row.activityId)}>{row.activityName?.sv}</Link></span>;
        return value;
      },
    },
  ];
  return (
    <Box>
      <Link href="/events" underline="hover" variant="body2">← Events</Link>
      <Typography variant="h4" component="h1" sx={{ mt: 0.5, mb: 2 }}>Import from the calendar</Typography>
      {configured === false && (
        <Alert severity="info" sx={{ mb: 2 }}>No calendar is configured: set private.googleCalendar ({'{ apiKey, calendarId }'}) in admin’s settings.</Alert>
      )}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Each calendar event is imported once. One with an activity’s name becomes an event of it; the rest are
        free-standing events of the association. Nobody is told of an imported event.
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2, alignItems: { sm: 'flex-start' } }}>
        <DateField label="From" value={from} onChange={onFrom} />
        <DateField label="To" value={to} onChange={onTo} />
        <Button variant="outlined" disabled={busy || !configured || !from || !to} onClick={onFetch} sx={{ height: 56 }}>Fetch</Button>
      </Stack>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 2 }}>{notice}</Alert>}
      {items && (
        <>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {items.length} in the calendar, {open.length} not imported.
            </Typography>
            <Button variant="contained" disabled={busy || chosen.length === 0} onClick={onImport}>
              Import {chosen.length > 0 ? chosen.length : ''} chosen
            </Button>
          </Stack>
          <DataList rows={items} columns={columns} getRowId={(row) => row.googleEventId} empty="Nothing in the calendar then." defaultSort={{ field: 'start', sort: 'asc' }} />
        </>
      )}
    </Box>
  );
};
