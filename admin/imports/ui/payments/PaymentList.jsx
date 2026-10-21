import React from 'react';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import { ServerDataList } from '../components/ServerDataList';
import { KIND, STATUS, day } from './labels';

const columns = (tab) => [
  { field: 'type', headerName: 'Type', width: 95 },
  { field: 'amount', headerName: 'Amount', type: 'number', width: 95 },
  { field: 'date', headerName: 'Date', width: 110, valueFormatter: (v) => day(v) },
  { field: 'message', headerName: 'Message', flex: 1, minWidth: 180 },
  ...(tab !== 'automatic' ? [{ field: 'clarification', headerName: 'Clarification', flex: 1, minWidth: 160 }] : []),
  ...(tab === 'store' ? [{ field: 'comment', headerName: 'Buyer comment', flex: 1, minWidth: 140 }] : []),
  {
    field: 'memberName', headerName: 'Member', width: 170, sortable: false,
    renderCell: ({ row }) => (row.member ? <Link href={`/member/${row.member}`} underline="hover">{row.memberName || row.member}</Link> : ''),
  },
  {
    field: 'kind', headerName: 'Kind', width: 140, sortable: false,
    renderCell: ({ row }) => <Chip size="small" color={KIND[row.kind].color} label={row.kind === 'purchase' && row.itemCode ? `Purchase: ${row.itemCode}` : KIND[row.kind].label} />,
  },
  {
    field: 'status', headerName: 'Status', width: 110, sortable: false,
    renderCell: ({ row }) => <Chip size="small" color={STATUS[row.kind].color} label={STATUS[row.kind].label} />,
  },
];

/** Payments of one tab, paged on the server; a row opens the payment. */
export const PaymentList = ({ tab, list }) => (
  <>
    {list.error && <Alert severity="error" sx={{ mb: 2 }}>{list.error}</Alert>}
    <ServerDataList {...list} columns={columns(tab)} empty="No payments." rowHref={(p) => `/payment/${p._id}`} />
  </>
);
