import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { DataList } from '../components/DataList';
import { MemberSelect } from '../components/MemberSelect';
import { TabToolbar } from '../components/PageTabs';
import { dateTime } from '../dates';
import { memberPath } from '../members/paths';

export const STATES = {
  approved: ['Has a seat', 'success'],
  checkedIn: ['Checked in', 'success'],
  attended: ['Came', 'primary'],
  queued: ['In the queue', 'warning'],
  missedCheckIn: ['Missed check-in', 'default'],
  noShow: ['Did not come', 'error'],
  withdrawn: ['Withdrew', 'default'],
  cancelled: ['Called off', 'default'],
};

/**
 * An event's registrations: who has a seat, who queues, who came. Board and
 * admin add someone, take someone off, give a queued member a free seat,
 * and record attendance from the start, closing it when done.
 *
 * @param {{ registrations: object[]|null, seats?: number, started: boolean, attendanceClosed: boolean,
 *           takesRegistrations: boolean, busy?: boolean, search: (q) => Promise<object[]>,
 *           onAdd: (member) => void, onWithdraw: (memberId) => void, onTakeSeat: (memberId) => void,
 *           onAttended: (memberId, attended: boolean) => void, onCloseAttendance: () => void }} props
 *   `seats` is the event's limit, none for no limit.
 */
export const Participants = ({
  registrations, seats, started, attendanceClosed, takesRegistrations, busy = false, search,
  onAdd, onWithdraw, onTakeSeat, onAttended, onCloseAttendance,
}) => {
  const [adding, setAdding] = useState(null);
  if (!takesRegistrations && !registrations?.length) {
    return <TabToolbar note="The event takes no registrations: set registration under Details." />;
  }
  const rows = registrations || [];
  const holding = rows.filter((r) => ['approved', 'checkedIn', 'attended'].includes(r.state)).length;
  const free = seats ? Math.max(0, seats - holding) : null;
  const columns = [
    {
      field: 'memberName', headerName: 'Member', flex: 1, minWidth: 180,
      renderCell: ({ row, value }) => <Link href={memberPath(row.memberId)} underline="hover">{value}{row.mid ? ` (${row.mid})` : ''}</Link>,
    },
    {
      field: 'state', headerName: 'State', width: 160,
      valueGetter: (value) => STATES[value]?.[0] || value,
      renderCell: ({ row }) => <Chip size="small" variant="outlined" color={STATES[row.state]?.[1] || 'default'} label={STATES[row.state]?.[0] || row.state} />,
    },
    { field: 'registeredAt', headerName: 'Registered', width: 160, type: 'dateTime', valueFormatter: (value) => dateTime(value) },
    { field: 'info', headerName: 'Information', flex: 1, minWidth: 160 },
    {
      field: 'actions', headerName: '', width: 230, sortable: false, filterable: false,
      renderCell: ({ row }) => (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', height: '100%' }}>
          {row.state === 'queued' && !started && (free === null || free > 0) && (
            <Button size="small" disabled={busy} onClick={() => onTakeSeat(row.memberId)}>Give seat</Button>
          )}
          {['approved', 'checkedIn', 'queued'].includes(row.state) && !started && (
            <Button size="small" color="warning" disabled={busy} onClick={() => onWithdraw(row.memberId)}>Take off</Button>
          )}
          {started && ['approved', 'checkedIn', 'noShow'].includes(row.state) && (
            <Button size="small" disabled={busy} onClick={() => onAttended(row.memberId, true)}>Came</Button>
          )}
          {started && row.state === 'attended' && (
            <Button size="small" disabled={busy} onClick={() => onAttended(row.memberId, false)}>Did not come</Button>
          )}
        </Stack>
      ),
    },
  ];
  return (
    <Box>
      <TabToolbar note={`${holding} with a seat${seats ? ` of ${seats}` : ''}, ${rows.filter((r) => r.state === 'queued').length} in the queue.${attendanceClosed ? ' Attendance is closed.' : ''}`}>
        {started && !attendanceClosed && (
          <Button variant="outlined" disabled={busy} onClick={onCloseAttendance}>Close attendance</Button>
        )}
      </TabToolbar>
      {!started && takesRegistrations && (
        <Box sx={{ mb: 2, maxWidth: 480 }}>
          <MemberSelect label="Add a participant" value={adding} search={search}
            helperText="Neither the certificate nor the information is asked for."
            onChange={(member) => { if (member) onAdd(member); setAdding(null); }} />
        </Box>
      )}
      {started && !attendanceClosed && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Mark who came; closing the attendance makes the rest no-shows.
        </Typography>
      )}
      <DataList rows={rows} columns={columns} loading={!registrations} empty="Nobody has signed up." defaultSort={{ field: 'registeredAt', sort: 'asc' }} />
    </Box>
  );
};
