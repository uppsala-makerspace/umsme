import React from 'react';
import Chip from '@mui/material/Chip';
import { linkColumn } from '../components/columns';
import { dateTime } from '../dates';
import { eventPath } from './paths';
import { eventName } from '/imports/common/lib/activityValues';

/** A cancelled event's mark; nothing for a confirmed one. */
export const StatusChip = ({ status }) => {
  if (status === 'cancelled') return <Chip size="small" color="error" variant="outlined" label="Cancelled" />;
  if (status === 'awaiting') return <Chip size="small" color="warning" variant="outlined" label="Awaiting participants" />;
  return null;
};

/**
 * The columns of a list of events.
 *
 * @param {{ activityOf: (event) => object|null, groupName: (id) => string, withActivity?: boolean }} options
 *   With `withActivity`, a column for the activity each is of ("free-standing" for none).
 */
export const eventColumns = ({ activityOf, groupName, withActivity = false }) => [
  {
    field: 'start', headerName: 'Start', type: 'dateTime', width: 160,
    valueFormatter: (value) => dateTime(value),
  },
  linkColumn('name', 'Name', (e) => eventPath(e._id), { valueGetter: (value, row) => eventName(row, activityOf(row)) }),
  ...(withActivity ? [{
    field: 'activityId', headerName: 'Activity', width: 220,
    valueGetter: (value, row) => (value ? activityOf(row)?.name?.sv || '' : 'Free-standing'),
  }] : []),
  { field: 'groupId', headerName: 'Group', width: 200, valueGetter: (value) => (value ? groupName(value) || '' : 'The association') },
  { field: 'hostMemberIds', headerName: 'Hosts', width: 90, type: 'number', valueGetter: (value) => value?.length || 0 },
  { field: 'seatsTaken', headerName: 'Registered', width: 110, type: 'number', valueGetter: (value) => value || 0 },
  {
    field: 'status', headerName: 'Status', width: 120,
    valueGetter: (value) => ({ cancelled: 'Cancelled', awaiting: 'Awaiting' }[value] || 'Confirmed'),
    renderCell: ({ row, value }) => (row.status === 'confirmed' || !row.status ? value : <StatusChip status={row.status} />),
  },
];
