import React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { DataList } from '../components/DataList';
import { dateColumn, linkColumn } from '../components/columns';

const columns = [
  linkColumn('title', 'Title', (doc) => `/liability/${doc._id}`),
  dateColumn('date', 'Date'),
];

/** The liability agreement versions, newest first. The newest is in force. */
export const LiabilityList = ({ loading, documents }) => (
  <Box>
    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
      <Typography variant="h4" component="h1">Liability documents</Typography>
      <Button variant="contained" href="/liability/add">Add liability document</Button>
    </Stack>
    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
      Members are asked to approve the version with the latest date. Adding a version asks everyone to approve again.
    </Typography>
    <DataList
      rows={documents}
      columns={columns}
      loading={loading}
      empty="No versions yet."
      defaultSort={{ field: 'date', sort: 'desc' }}
    />
  </Box>
);
