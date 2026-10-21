import React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { DataList } from '../components/DataList';
import { linkColumn } from '../components/columns';
import { typeLabel, statusLabel, moment } from './labels';

const when = (field, headerName) => ({
  field, headerName, type: 'dateTime', width: 160, valueGetter: (v) => (v ? new Date(v) : null), valueFormatter: (v) => moment(v),
});

const columns = [
  linkColumn('subjectSv', 'Subject', (a) => `/announcement/${a._id}`),
  { field: 'type', headerName: 'Type', width: 140, valueGetter: (v) => typeLabel(v) },
  {
    field: 'status', headerName: 'Status', width: 110, valueGetter: (v) => statusLabel(v),
    renderCell: ({ value }) => <Chip size="small" label={value} color={value === 'Sent' ? 'success' : 'default'} />,
  },
  when('createdAt', 'Created'),
  when('sentAt', 'Sent'),
];

/**
 * Newsletters and information to the members, drafts and sent.
 *
 * @param {{ loading: boolean, announcements: object[] }} props
 */
export const AnnouncementList = ({ loading, announcements }) => (
  <Box>
    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
      <Typography variant="h4" component="h1">Announcements</Typography>
      <Button variant="contained" href="/announcements/new">New announcement</Button>
    </Stack>
    <DataList
      rowHref={(a) => `/announcement/${a._id}`}
      rows={announcements}
      columns={columns}
      loading={loading}
      empty="No announcements yet."
      defaultSort={{ field: 'createdAt', sort: 'desc' }}
    />
  </Box>
);
