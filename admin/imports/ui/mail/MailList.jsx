import React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { DataList } from '../components/DataList';
import { linkColumn } from '../components/columns';
import { groupLabel, sentAt } from './labels';

const columns = [
  linkColumn('subject', 'Subject', (m) => `/mail/${m._id}`, { minWidth: 260 }),
  { field: 'from', headerName: 'From', width: 200 },
  { field: 'recipients', headerName: 'Recipients', width: 180, valueGetter: (v) => groupLabel(v) },
  { field: 'family', headerName: 'Family members', type: 'boolean', width: 130 },
  { field: 'sent', headerName: 'Sent', type: 'number', width: 80 },
  { field: 'failed', headerName: 'Failed', type: 'number', width: 80 },
  { field: 'senddate', headerName: 'Sent date', type: 'dateTime', width: 150, valueGetter: (v) => (v ? new Date(v) : null), valueFormatter: (v) => sentAt(v) },
];

/**
 * The group mails sent from admin.
 *
 * @param {{ mails: object[], loading?: boolean, error?: string, canSend?: boolean }} props
 */
export const MailList = ({ mails, loading = false, error, canSend = true }) => (
  <Box>
    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
      <Typography variant="h4" component="h1">Sent mails</Typography>
      {canSend && <Button variant="contained" href="/mail/send">Send mail</Button>}
    </Stack>
    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
    <DataList rows={mails} columns={columns} loading={loading} empty="No mails sent." defaultSort={{ field: 'senddate', sort: 'desc' }} rowHref={(m) => `/mail/${m._id}`} />
  </Box>
);
