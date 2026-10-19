import React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { DataList } from '../components/DataList';
import { linkColumn } from '../components/columns';

const columns = [
  { field: 'code', headerName: 'Code', width: 140 },
  linkColumn('name', 'Name', (item) => `/storeitem/${item._id}`, { valueGetter: (value) => value?.sv || value?.en || '' }),
  {
    field: 'price', headerName: 'Price (kr)', type: 'number', width: 130,
    valueFormatter: (value, row) => (typeof value === 'number' ? value
      : [row.minPrice, row.maxPrice].some((v) => typeof v === 'number') ? `${row.minPrice ?? ''}–${row.maxPrice ?? ''}` : 'buyer sets'),
  },
  { field: 'requiresMembership', headerName: 'Members only', type: 'boolean', width: 130 },
  { field: 'bookkeepingAccount', headerName: 'Bookkeeping account', width: 180 },
  { field: 'status', headerName: 'Status', width: 120, valueGetter: (value) => (value === 'hidden' ? 'Hidden' : 'Available') },
];

/** What members can buy in the app's web shop. */
export const StoreItemList = ({ loading, items }) => (
  <Box>
    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
      <Typography variant="h4" component="h1">Store items</Typography>
      <Button variant="contained" href="/storeitems/add">Add store item</Button>
    </Stack>
    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
      What members can buy in the app&apos;s web shop. Without a price the buyer sets the amount (clay by weight, a donation).
      Purchases are booked on the item&apos;s bookkeeping account.
    </Typography>
    <DataList rows={items} columns={columns} loading={loading} empty="No items yet." defaultSort={{ field: 'code', sort: 'asc' }} />
  </Box>
);
