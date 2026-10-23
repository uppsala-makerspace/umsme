import React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { ServerDataList } from '../components/ServerDataList';
import { EXPENSE_STATUSES, STATUS_COLOR, statusText, kr, isoDay } from './labels';
import { DateField } from '../components/DateField';

const native = { select: { native: true }, inputLabel: { shrink: true } };

export const expenseColumns = [
  { field: 'date', headerName: 'Date', width: 110, valueFormatter: (v) => isoDay(v) },
  {
    field: 'type', headerName: 'Type', width: 95,
    renderCell: ({ value }) => (value === 'invoice' ? <Chip size="small" color="warning" label="invoice" /> : 'receipt'),
  },
  {
    field: 'dueDate', headerName: 'Due date', width: 110,
    renderCell: ({ value }) => {
      if (!value) return '';
      const days = (new Date(value) - new Date()) / 86400000;
      return <Typography variant="body2" component="span" color={days < 0 ? 'error.main' : days < 7 ? 'warning.dark' : 'inherit'}>{isoDay(value)}</Typography>;
    },
  },
  { field: 'memberName', headerName: 'Member', flex: 1, minWidth: 160, sortable: false },
  { field: 'accountName', headerName: 'Account', flex: 1, minWidth: 140, sortable: false },
  { field: 'place', headerName: 'Supplier / place', flex: 1, minWidth: 140 },
  { field: 'amount', headerName: 'Amount', type: 'number', width: 110, valueFormatter: (v) => (typeof v === 'number' ? kr(v) : '') },
  {
    field: 'status', headerName: 'Status', width: 120,
    renderCell: ({ row }) => <Chip size="small" color={STATUS_COLOR[row.status] || 'default'} label={statusText(row)} />,
  },
];

/** A list of expenses, paged on the server; a row opens the expense. */
export const ExpenseTable = ({ list, empty = 'No expenses.' }) => (
  <>
    {list.error && <Alert severity="error" sx={{ mb: 2 }}>{list.error}</Alert>}
    <ServerDataList {...list} columns={expenseColumns} empty={empty} rowHref={(e) => `/expense/${e._id}`} />
  </>
);

/**
 * All expenses, narrowed by status and date, or one of the work queues
 * (nothing to filter there).
 *
 * @param {{ title: string, list: object, filters?: { status, from, to }, onFilter?: (field, value) => void,
 *           onClearFilters?: () => void }} props
 *   `list` as useServerList gives it; without `filters` there are none.
 */
export const ExpenseList = ({ title, list, filters, onFilter, onClearFilters }) => (
  <Box>
    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
      <Typography variant="h4" component="h1">{title}</Typography>
      <Button href="/expenses/accounts">Expense accounts</Button>
    </Stack>
    {filters && (
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2, alignItems: { sm: 'center' } }}>
        <TextField label="Status" select slotProps={native} value={filters.status} onChange={(e) => onFilter('status', e.target.value)} sx={{ minWidth: 160 }}>
          <option value="">All</option>
          {EXPENSE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </TextField>
        <DateField label="From" value={filters.from} onChange={(v) => onFilter('from', v)} />
        <DateField label="To" value={filters.to} onChange={(v) => onFilter('to', v)} />
        {(filters.status || filters.from || filters.to) && <Button onClick={onClearFilters}>Clear filters</Button>}
      </Stack>
    )}
    <ExpenseTable list={list} />
  </Box>
);
