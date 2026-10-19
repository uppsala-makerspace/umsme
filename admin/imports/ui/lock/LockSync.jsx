import React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { DataList } from '../components/DataList';

/** The statuses, in the order of the filters, with what they mean on the door. */
export const STATUSES = [
  { value: 'wrong', label: 'Wrong date', filter: 'Wrong date', color: 'error' },
  { value: 'stale', label: 'Stale', filter: 'Stale (Needs synchronization)', color: 'warning' },
  { value: 'noaccount', label: 'No account', filter: 'No account', color: 'default' },
  { value: 'invited', label: 'Invited', filter: 'Invited', color: 'info' },
  { value: 'correct', label: 'Correct date', filter: 'Correct date', color: 'success' },
  { value: 'forever', label: 'No end date', filter: 'No end date', color: 'warning' },
  { value: 'admin', label: 'Administrator', filter: 'Administrators', color: 'primary' },
  { value: 'old', label: 'Expired access', filter: 'Expired access', color: 'default' },
];
const byValue = Object.fromEntries(STATUSES.map((s) => [s.value, s]));

/**
 * The lab members against the door lock: does their access end when their
 * lab membership does? Synchronize asks the lock; a wrong end date can be
 * fixed, after which the row is stale until the next synchronization.
 *
 * @param {{ rows: object[]|null, shown: string[], onShownChange: (statuses) => void,
 *           onSynchronize: () => void, onFix: (memberId) => void, busy?: boolean, error?: string }} props
 *   `rows` is null before the first synchronization.
 */
export const LockSync = ({ rows, shown, onShownChange, onSynchronize, onFix, busy = false, error }) => {
  const columns = [
    {
      field: 'name', headerName: 'Name', flex: 1, minWidth: 180,
      renderCell: ({ row, value }) => <Link href={`/member/${row._id}`} underline="hover" sx={{ fontWeight: 600 }}>{value}</Link>,
    },
    { field: 'email', headerName: 'Email', flex: 1, minWidth: 200 },
    { field: 'lockId', headerName: 'Lock user id', width: 170 },
    { field: 'labEnd', headerName: 'Lab end date', width: 120 },
    { field: 'lockEnd', headerName: 'Lock end date', width: 120 },
    {
      field: 'status', headerName: 'Status', width: 150, valueGetter: (v) => byValue[v]?.label || v,
      renderCell: ({ row, value }) => <Chip size="small" label={value} color={byValue[row.status]?.color || 'default'} />,
    },
    {
      field: 'fix', headerName: 'Fix', width: 100, sortable: false, filterable: false,
      renderCell: ({ row }) => (row.fix ? <Button size="small" variant="outlined" disabled={busy} onClick={() => onFix(row._id)}>Fix it</Button> : null),
    },
  ];
  const toggle = (value, on) => onShownChange(on ? [...shown, value] : shown.filter((s) => s !== value));
  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h4" component="h1">Lock synchronization</Typography>
        <Button variant="contained" disabled={busy} onClick={onSynchronize}>Synchronize</Button>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Each lab member&apos;s access on the outer door should end when their lab membership does. Synchronize asks the lock;
        Fix it sets the lock&apos;s end date to the lab end date.
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <FormGroup row sx={{ mb: 1 }}>
        {STATUSES.map((s) => (
          <FormControlLabel key={s.value} label={s.filter}
            control={<Checkbox size="small" checked={shown.includes(s.value)} onChange={(e) => toggle(s.value, e.target.checked)} />} />
        ))}
      </FormGroup>
      {rows === null
        ? <Typography color="text.secondary">{busy ? 'Asking the lock…' : 'Synchronize to compare the lock with the lab memberships.'}</Typography>
        : <DataList rows={rows.filter((r) => shown.includes(r.status))} columns={columns} loading={busy} empty="Nobody with these statuses." defaultSort={{ field: 'name', sort: 'asc' }} />}
    </Box>
  );
};
