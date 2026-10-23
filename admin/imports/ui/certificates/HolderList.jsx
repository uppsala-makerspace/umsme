import React, { useState } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Link from '@mui/material/Link';
import { DataList } from '../components/DataList';
import { day } from './format';
import { memberPath } from '../members/paths';
import { certificatePath } from './paths';

/**
 * Attestations as a list: who holds a certificate (`show` 'member') or what
 * a member holds (`show` 'certificate'), with a Revoke button on each.
 *
 * @param {{ show: 'member'|'certificate', rows: object[]|null, onRevoke: (attestationId) => void, busy?: boolean }} props
 *   Rows as certificates.holders and certificates.ofMember return them.
 */
export const HolderList = ({ show, rows, onRevoke, busy = false }) => {
  const [revoking, setRevoking] = useState(null);
  const columns = [
    show === 'member'
      ? {
        field: 'memberName', headerName: 'Member', flex: 1, minWidth: 200,
        renderCell: ({ row }) => <Link href={memberPath(row.memberId, 'certificates')} underline="hover" sx={{ fontWeight: 600 }}>{row.memberName}</Link>,
      }
      : {
        field: 'certificateName', headerName: 'Certificate', flex: 1, minWidth: 200,
        renderCell: ({ row }) => <Link href={certificatePath(row.certificateId, 'holders')} underline="hover" sx={{ fontWeight: 600 }}>{row.certificateName}</Link>,
      },
    ...(show === 'member' ? [{ field: 'memberMid', headerName: 'Member number', width: 130 }] : []),
    { field: 'startDate', headerName: 'Start', width: 120, type: 'date', valueGetter: (v) => (v ? new Date(v) : null), valueFormatter: (v) => day(v) },
    {
      field: 'endDate', headerName: 'End', width: 120, type: 'date',
      valueGetter: (v) => (v ? new Date(v) : null), valueFormatter: (v) => (v ? day(v) : 'No expiry'),
    },
    {
      field: 'certifierName', headerName: 'Certified by', width: 200,
      valueGetter: (v, row) => (row.pending ? 'Requested, not yet confirmed' : v),
      renderCell: ({ row, value }) => (row.certifierId && row.certifierId !== '__system__'
        ? <Link href={`/member/${row.certifierId}`} underline="hover">{value}</Link>
        : value),
    },
    { field: 'comment', headerName: 'Comment', flex: 1, minWidth: 160 },
    {
      field: 'actions', headerName: '', width: 100, sortable: false, filterable: false,
      renderCell: ({ row }) => <Button size="small" color="error" disabled={busy} onClick={() => setRevoking(row)}>Revoke</Button>,
    },
  ];
  return (
    <>
      <DataList
        rows={rows || []} columns={columns} loading={!rows}
        empty={show === 'member' ? 'Nobody holds this certificate.' : 'No certificates.'}
        defaultSort={{ field: 'startDate', sort: 'desc' }}
      />
      <Dialog open={!!revoking} onClose={() => setRevoking(null)}>
        <DialogTitle>Revoke this certificate?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {revoking && (show === 'member' ? `${revoking.memberName} no longer holds it.` : `The member no longer holds ${revoking.certificateName}.`)}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRevoking(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => { onRevoke(revoking._id); setRevoking(null); }}>Revoke</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
