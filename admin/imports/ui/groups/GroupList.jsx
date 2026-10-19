import React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { DataList } from '../components/DataList';
import { linkColumn } from '../components/columns';
import { typeLabel, joinPolicyLabel } from './labels';

const columns = [
  linkColumn('name', 'Name', (g) => `/group/${g._id}`, { valueGetter: (value) => value?.sv || '' }),
  { field: 'type', headerName: 'Type', width: 270, valueGetter: (value) => (value ? typeLabel(value) : '') },
  { field: 'allowJoinRequests', headerName: 'Members may ask to join', type: 'boolean', width: 200, valueGetter: (value) => value !== false },
  { field: 'joinPolicy', headerName: 'Join policy', width: 320, valueGetter: (value) => joinPolicyLabel(value || 'request-responsible') },
];

/**
 * The groups: steering, function and responsibility groups.
 *
 * @param {{ loading: boolean, groups: object[] }} props
 */
export const GroupList = ({ loading, groups }) => (
  <Box>
    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
      <Typography variant="h4" component="h1">Groups</Typography>
      <Button variant="contained" href="/groups/add">Add group</Button>
    </Stack>
    <DataList
      rowHref={(g) => `/group/${g._id}`}
      rows={groups}
      columns={columns}
      loading={loading}
      empty="No groups yet."
      defaultSort={{ field: 'name', sort: 'asc' }}
    />
  </Box>
);
