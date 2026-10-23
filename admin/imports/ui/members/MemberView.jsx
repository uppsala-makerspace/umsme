import React, { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Link from '@mui/material/Link';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { DataList } from '../components/DataList';
import { MemberForm } from './MemberForm';
import { MemberStatusChips } from './MemberStatusChips';

const day = (date) => (date ? new Date(date).toLocaleDateString('sv-SE') : '');

const membershipColumns = [
  { field: 'start', headerName: 'Start', width: 115, valueFormatter: (v) => day(v) },
  { field: 'type', headerName: 'Type', width: 130 },
  { field: 'amount', headerName: 'Amount', type: 'number', width: 100 },
  { field: 'discount', headerName: 'Discount', type: 'boolean', width: 95 },
  { field: 'family', headerName: 'Family', type: 'boolean', width: 85 },
  { field: 'memberend', headerName: 'Membership end', width: 140, valueFormatter: (v) => day(v) },
  { field: 'labend', headerName: 'Lab membership end', width: 160, valueFormatter: (v) => day(v) },
  { field: 'pid', headerName: 'Payment', width: 95, sortable: false, renderCell: ({ value }) => (value ? <Chip size="small" color="success" label="Bank" /> : '') },
];

const familyColumns = [
  { field: 'mid', headerName: 'Id', width: 80 },
  { field: 'name', headerName: 'Name', flex: 1, minWidth: 180, renderCell: ({ row, value }) => <Link href={`/member/${row._id}`} underline="hover">{value}</Link> },
  { field: 'email', headerName: 'Email', flex: 1, minWidth: 200 },
  { field: 'member', headerName: 'Member date', width: 120, valueFormatter: (v) => day(v) },
  { field: 'lab', headerName: 'Lab date', width: 120, valueFormatter: (v) => day(v) },
];

/**
 * A member's page: their status, registration and exclusion, details
 * (saved with Save), family, memberships and, below, what the container adds
 * (messages, comments, certificates). Every action other than Save takes
 * effect at once.
 *
 * @param {{ member: object, detail: object, values: object, onChange: (field, value) => void, onSave: () => void,
 *           busy?: boolean, error?: string, notice?: string, now?: Date,
 *           on: { refresh, register, exclude, remove, removeFromFamily, cancelInvite, declineInvite },
 *           after?: React.ReactNode }} props
 *   `detail` as members.detail returns it; `member` carries its reminderState.
 */
export const MemberView = ({ member, detail, values, onChange, onSave, busy = false, error, notice, now = new Date(), on, after }) => {
  const [asking, setAsking] = useState(null);
  const ask = (title, text, confirmLabel, then) => setAsking({ title, text, confirmLabel, then });
  const patron = member.family && !member.infamily;
  return (
    <Box sx={{ maxWidth: 1100 }}>
      <Link href="/members" underline="hover" variant="body2">← Members</Link>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mt: 0.5, mb: 1 }}>
        <Typography variant="h4" component="h1">Member <strong>{member.name}</strong></Typography>
        <Button color="error" variant="outlined" disabled={busy}
          onClick={() => (detail.familyMembers.length
            ? ask('The member pays for a family', 'Before you can remove this member you have to disconnect the family members.', null, null)
            : ask('Delete this member?', 'The member is deleted with all their memberships and messages.', 'Delete member', on.remove))}>
          Delete member
        </Button>
      </Stack>
      {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 1.5 }}>{notice}</Alert>}
      <MemberStatusChips member={member} inconsistent={detail.status.inconsistent} now={now} onRefresh={on.refresh} busy={busy} />
      {!member.infamily && (
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center', mb: 1 }}>
          {member.registered
            ? <><Chip size="small" color="success" label="Registered" /><Button size="small" color="error" disabled={busy} onClick={() => ask('Revoke registration?', 'The member is no longer accepted by the board.', 'Revoke', () => on.register(false))}>Revoke registration</Button></>
            : <><Chip size="small" color="warning" label="Not registered" /><Button size="small" variant="outlined" color="success" disabled={busy} onClick={() => on.register(true)}>Accept member</Button></>}
          {member.excluded
            ? <><Chip size="small" color="error" label="Excluded" /><Button size="small" variant="outlined" color="success" disabled={busy} onClick={() => on.exclude(false)}>Reinstate</Button></>
            : <Button size="small" color="error" disabled={busy} onClick={() => ask('Exclude this member?', 'They lose door access and payment ability, and are skipped by reminders, mails and notifications.', 'Exclude member', () => on.exclude(true))}>Exclude</Button>}
        </Stack>
      )}
      {detail.user && (
        <Typography variant="body2" sx={{ mb: 2 }}>
          <Link href={`/user/${detail.user._id}`}>User account: {detail.user.username}</Link>
        </Typography>
      )}

      <MemberForm values={values} onChange={onChange} onSave={onSave} member={member} busy={busy} />

      {detail.payer && (
        <Typography variant="h5" component="h2" sx={{ mt: 4 }}>
          Part of family, paying family member is <strong><Link href={`/member/${detail.payer._id}`}>{detail.payer.name}</Link></strong>
          <Button size="small" sx={{ ml: 1 }} disabled={busy} onClick={() => ask('Remove from the family?', 'The member remains as an independent member that has to pay for itself.', 'Remove', on.removeFromFamily)}>Remove from family</Button>
        </Typography>
      )}
      {patron && (
        <>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center', mt: 4, mb: 1 }}>
            <Typography variant="h5" component="h2">Family members</Typography>
            <Button size="small" variant="outlined" href={`/member/${member._id}/add`}>Add existing</Button>
            <Button size="small" variant="outlined" href={`/members/add?infamily=${member._id}`}>Add new</Button>
          </Stack>
          <DataList rows={detail.familyMembers} columns={familyColumns} empty="No family members yet." rowHref={(m) => `/member/${m._id}`} />
          <Typography variant="h5" component="h2" sx={{ mt: 3, mb: 1 }}>Pending invites</Typography>
          {detail.invites.length === 0 ? <Typography variant="body2" color="text.secondary">No outstanding invites.</Typography> : (
            <List dense disablePadding>
              {detail.invites.map((invite) => (
                <ListItem key={invite._id} divider secondaryAction={<Button size="small" color="error" disabled={busy} onClick={() => ask('Cancel the invite?', `The pending invite to ${invite.email} is cancelled.`, 'Cancel invite', () => on.cancelInvite(invite._id))}>Cancel invite</Button>}>
                  {invite.invitee ? <><Link href={`/member/${invite.invitee._id}`}>{invite.invitee.name}</Link>&nbsp;{invite.email}</> : invite.email}
                </ListItem>
              ))}
            </List>
          )}
        </>
      )}
      {detail.invitesReceived.length > 0 && (
        <>
          <Typography variant="h5" component="h2" sx={{ mt: 4, mb: 1 }}>Invitations to other families</Typography>
          <List dense disablePadding>
            {detail.invitesReceived.map((invite) => (
              <ListItem key={invite._id} divider secondaryAction={<Button size="small" color="error" disabled={busy} onClick={() => ask('Decline the invitation?', `The invitation from ${invite.inviterName} is declined.`, 'Decline', () => on.declineInvite(invite._id))}>Decline</Button>}>
                From&nbsp;<Link href={`/member/${invite.infamily}`}>{invite.inviterName}</Link>
              </ListItem>
            ))}
          </List>
        </>
      )}
      {!member.infamily && (
        <>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center', mt: 4, mb: 1 }}>
            <Typography variant="h5" component="h2">Memberships</Typography>
            <Button size="small" variant="outlined" href={`/memberships/add?member=${member._id}`}>Add membership</Button>
          </Stack>
          <DataList rows={detail.memberships} columns={membershipColumns} empty="No memberships." defaultSort={{ field: 'start', sort: 'desc' }} rowHref={(ms) => `/membership/${ms._id}`} />
        </>
      )}
      {after}

      <Dialog open={!!asking} onClose={() => setAsking(null)}>
        <DialogTitle>{asking?.title}</DialogTitle>
        <DialogContent><DialogContentText>{asking?.text}</DialogContentText></DialogContent>
        <DialogActions>
          <Button onClick={() => setAsking(null)}>{asking?.then ? 'Keep' : 'Close'}</Button>
          {asking?.then && <Button variant="contained" color="error" onClick={() => { const { then } = asking; setAsking(null); then(); }}>{asking.confirmLabel}</Button>}
        </DialogActions>
      </Dialog>
    </Box>
  );
};
