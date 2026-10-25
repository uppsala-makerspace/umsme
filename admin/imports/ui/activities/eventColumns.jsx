import React from 'react';
import Chip from '@mui/material/Chip';
import { linkColumn } from '../components/columns';
import { dateTime } from '../dates';
import { eventPath } from './paths';
import { eventName } from '/imports/common/lib/activityValues';

/** A cancelled event's mark; nothing for a confirmed one. */
export const StatusChip = ({ status }) => (status === 'cancelled'
  ? <Chip size="small" color="error" variant="outlined" label="Cancelled" />
  : null);

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
  {
    field: 'status', headerName: 'Status', width: 120,
    valueGetter: (value) => (value === 'cancelled' ? 'Cancelled' : 'Confirmed'),
    renderCell: ({ row, value }) => (row.status === 'cancelled' ? <StatusChip status="cancelled" /> : value),
  },
];
