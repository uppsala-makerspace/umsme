import React from 'react';
import Box from '@mui/material/Box';
import FormControlLabel from '@mui/material/FormControlLabel';
import Link from '@mui/material/Link';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { DataList } from '../components/DataList';
import { day } from '../certificates/format';

const FILTERS = [
  { value: 'all', label: 'All historic members' },
  { value: 'active', label: 'Current members' },
  { value: 'inactive', label: 'Members that left' },
];

const columns = [
  {
    field: 'name', headerName: 'Name', flex: 1, minWidth: 180,
    renderCell: ({ row, value }) => <Link href={`/member/${row._id}`} underline="hover" sx={{ fontWeight: 600 }}>{value}</Link>,
  },
  { field: 'email', headerName: 'Email', flex: 1, minWidth: 200 },
  { field: 'years', headerName: 'Years', type: 'number', width: 80 },
  { field: 'days', headerName: 'Days since joined', type: 'number', width: 150 },
  { field: 'left', headerName: 'Last membership day', width: 170, valueFormatter: (v) => day(v) },
  { field: 'lab', headerName: 'Lab', width: 90, valueFormatter: (v) => (v === 'current' ? 'Yes' : v === 'expired' ? 'Expired' : '') },
  { field: 'family', headerName: 'Family', type: 'boolean', width: 80 },
];

const Figures = ({ items }) => (
  <Box>
    {items.map(([label, value]) => (
      <Typography key={label} variant="body2">{label}: <strong>{value ?? '–'}</strong></Typography>
    ))}
  </Box>
);

/**
 * Who has been a member, how long, and who still is, with the counts now.
 *
 * @param {{ loading: boolean, stats?: object, rows: object[], filter: 'all'|'active'|'inactive',
 *           onFilterChange: (filter) => void }} props
 */
export const History = ({ loading, stats = {}, rows, filter, onFilterChange }) => {
  const shown = rows.filter((r) => filter === 'all' || (filter === 'active' ? r.active : !r.active));
  return (
    <Box>
      <Typography variant="h4" component="h1" sx={{ mb: 2 }}>Member history</Typography>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={6} sx={{ mb: 2 }}>
        <RadioGroup value={filter} onChange={(e) => onFilterChange(e.target.value)}>
          {FILTERS.map((f) => <FormControlLabel key={f.value} value={f.value} control={<Radio size="small" />} label={f.label} />)}
        </RadioGroup>
        <Figures items={[['Historic members', stats.historic], ['Current members', stats.active], ['Members in families', stats.infamily], ['Paying members', stats.paying]]} />
        <Figures items={[['Individual membership payment', stats.member], ['Individual lab membership payment', stats.lab], ['Family membership payment', stats.family], ['Family lab membership payment', stats.labfamily]]} />
      </Stack>
      <DataList rows={shown} columns={columns} loading={loading} empty="No members." defaultSort={{ field: 'days', sort: 'desc' }} rowHref={(r) => `/member/${r._id}`} />
    </Box>
  );
};
