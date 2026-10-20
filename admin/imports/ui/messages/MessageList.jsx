import React from 'react';
import Link from '@mui/material/Link';
import { DataList } from '../components/DataList';

const columns = [
  { field: 'senddate', headerName: 'Sent', width: 170, valueFormatter: (v) => (v ? new Date(v).toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' }) : '') },
  { field: 'type', headerName: 'Message type', width: 140 },
  {
    field: 'subject', headerName: 'Subject', flex: 1, minWidth: 220,
    renderCell: ({ row, value }) => <Link href={`/message/${row._id}`} underline="hover">{value}</Link>,
  },
];

/**
 * The messages sent, newest first; a row opens the message.
 *
 * @param {{ loading: boolean, messages: object[] }} props
 */
export const MessageList = ({ loading, messages }) => (
  <DataList rows={messages} columns={columns} loading={loading} empty="No messages." defaultSort={{ field: 'senddate', sort: 'desc' }} rowHref={(m) => `/message/${m._id}`} />
);
