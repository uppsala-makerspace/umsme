import React from 'react';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import { day } from '../certificates/format';

const REMINDER = {
  done: { color: 'success' },
  needed: { label: 'Reminder needed', color: 'error' },
  overdue: { label: 'Reminder overdue', color: 'error' },
  old: { color: 'default' },
};

const date = (field, headerName) => ({
  field, headerName, width: 115, valueFormatter: (v) => day(v),
});

/** The columns of a member list, as the members list has had them. */
export const memberColumns = [
  { field: 'mid', headerName: 'Id', width: 80 },
  {
    field: 'name', headerName: 'Name', flex: 1, minWidth: 180,
    renderCell: ({ row, value }) => <Link href={`/member/${row._id}`} underline="hover" sx={{ fontWeight: 600 }}>{value}</Link>,
  },
  { field: 'email', headerName: 'Email', flex: 1, minWidth: 200 },
  { field: 'mobile', headerName: 'Mobile', width: 120, valueFormatter: (v) => (v ? v.replace(/\+46 \(0\)/, '0').replaceAll(' ', '') : '') },
  date('member', 'Member date'),
  date('lab', 'Lab date'),
  {
    field: 'family', headerName: 'Family', width: 90,
    valueFormatter: (v, row) => (row.family ? (row.infamily ? 'Member' : 'Paying') : ''),
  },
  { field: 'youth', headerName: 'Youth', type: 'boolean', width: 75 },
  { field: 'liability', headerName: 'Liability', type: 'boolean', width: 85 },
  {
    field: 'reminder', headerName: 'Reminder', width: 150,
    renderCell: ({ row }) => {
      const shown = REMINDER[row.reminderState];
      if (!shown) return null;
      return <Chip size="small" color={shown.color} label={shown.label || day(row.reminder)} />;
    },
  },
  { field: 'lock', headerName: 'Lock', width: 70, valueFormatter: (v) => (v ? '✓' : '') },
  { field: 'storage', headerName: 'Storage', width: 90 },
];
