import React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { DataList } from '../components/DataList';
import { linkColumn } from '../components/columns';
import { kindLabel, statusLabel } from './labels';

/**
 * Workshops and areas of interest.
 *
 * @param {{ loading: boolean, workshops: object[], groupName: (id) => string }} props
 */
export const WorkshopList = ({ loading, workshops, groupName }) => {
  const columns = [
    linkColumn('name', 'Name', (w) => `/workshop/${w._id}`, { valueGetter: (value) => value?.sv || '' }),
    { field: 'kind', headerName: 'Kind', width: 230, valueGetter: (value) => kindLabel(value || 'workshop') },
    { field: 'status', headerName: 'Status', width: 210, valueGetter: (value) => statusLabel(value) },
    { field: 'groupId', headerName: 'Steering group', width: 220, valueGetter: (value) => (value ? groupName(value) || '' : '') },
  ];
  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1">Workshops &amp; areas of interest</Typography>
        <Button variant="contained" href="/workshops/add">Add workshop or area of interest</Button>
      </Stack>
      <DataList
        rowHref={(w) => `/workshop/${w._id}`}
        rows={workshops}
        columns={columns}
        loading={loading}
        empty="No workshops yet."
        defaultSort={{ field: 'name', sort: 'asc' }}
      />
    </Box>
  );
};
