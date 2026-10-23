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
import { PageTabs, TabPanel, TabPart, TabToolbar } from '../components/PageTabs';
import { MemberForm } from './MemberForm';
import { MemberStatusChips } from './MemberStatusChips';
import { memberPath } from './paths';

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

/** The tabs a member has: a family member has no memberships or messages of their own. */
export const tabsFor = (member) => (member.infamily
  ? ['details', 'family', 'comments', 'certificates']
  : ['details', 'family', 'memberships', 'messages', 'comments', 'certificates']);

const Panel = ({ tab, shown, children }) => <TabPanel value={tab} shown={shown} label={LABELS[tab]}>{children}</TabPanel>;

const LABELS = { details: 'Details', family: 'Family members', memberships: 'Memberships', messages: 'Messages', comments: 'Comments', certificates: 'Certificates' };

/**
 * A member's page: their status, registration and exclusion above, and tabs
 * below: details (saved with Save), family, memberships, and what the
 * container adds (messages, comments, certificates). Every action other than
 * Save takes effect at once. Every tab stays put while another shows, so
 * unsaved details survive a look at the memberships.
 *
 * @param {{ member: object, detail: object, values: object, onChange: (field, value) => void, onSave: () => void,
 *           busy?: boolean, error?: string, notice?: string, now?: Date,
 *           tab: string, onTab: (tab) => void, counts?: { messages?, comments?, certificates? },
 *           on: { refresh, register, exclude, remove, removeFromFamily, cancelInvite, declineInvite },
 *           messages?: React.ReactNode, comments?: React.ReactNode, certificates?: React.ReactNode }} props
 *   `detail` as members.detail returns it; `member` carries its reminderState.
 *   `tab` one of tabsFor(member); another shows the details.
 */
export const MemberView = ({ member, detail, values, onChange, onSave, busy = false, error, notice, now = new Date(), tab, onTab, counts = {}, on, messages, comments, certificates }) => {
  const [asking, setAsking] = useState(null);
  const ask = (title, text, confirmLabel, then) => setAsking({ title, text, confirmLabel, then });
  const patron = member.family && !member.infamily;
  const tabs = tabsFor(member);
  const shown = tabs.includes(tab) ? tab : 'details';
  const count = (t) => ({
    family: patron ? detail.familyMembers.length : undefined,
    memberships: detail.memberships.length,
    messages: counts.messages,
    comments: counts.comments,
    certificates: counts.certificates,
  })[t];
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

      <PageTabs tabs={tabs.map((t) => ({ value: t, label: LABELS[t], count: count(t) }))} value={shown} onChange={onTab} href={(t) => memberPath(member._id, t)} />

      <Panel tab="details" shown={shown}>
        <MemberForm values={values} onChange={onChange} onSave={onSave} member={member} busy={busy} />
      </Panel>

      <Panel tab="family" shown={shown}>
        {detail.payer && (
          <TabPart title="Paying family member"
            actions={<Button size="small" disabled={busy} onClick={() => ask('Remove from the family?', 'The member remains as an independent member that has to pay for itself.', 'Remove', on.removeFromFamily)}>Remove from family</Button>}>
            <Link href={memberPath(detail.payer._id, 'family')}>{detail.payer.name}</Link> pays for the family.
          </TabPart>
        )}
        {patron && (
          <>
            <TabPart title="Family members" count={detail.familyMembers.length}
              actions={<><Button size="small" variant="outlined" href={`/member/${member._id}/add`}>Add existing</Button><Button size="small" variant="outlined" href={`/members/add?infamily=${member._id}`}>Add new</Button></>}>
              <DataList rows={detail.familyMembers} columns={familyColumns} empty="No family members yet." rowHref={(m) => `/member/${m._id}`} />
            </TabPart>
            <TabPart title="Pending invites" count={detail.invites.length}>
              {detail.invites.length === 0 ? <Typography variant="body2" color="text.secondary">No outstanding invites.</Typography> : (
                <List dense disablePadding>
                  {detail.invites.map((invite) => (
                    <ListItem key={invite._id} divider secondaryAction={<Button size="small" color="error" disabled={busy} onClick={() => ask('Cancel the invite?', `The pending invite to ${invite.email} is cancelled.`, 'Cancel invite', () => on.cancelInvite(invite._id))}>Cancel invite</Button>}>
                      {invite.invitee ? <><Link href={`/member/${invite.invitee._id}`}>{invite.invitee.name}</Link>&nbsp;{invite.email}</> : invite.email}
                    </ListItem>
                  ))}
                </List>
              )}
            </TabPart>
          </>
        )}
        {detail.invitesReceived.length > 0 && (
          <TabPart title="Invitations to other families" count={detail.invitesReceived.length}>
            <List dense disablePadding>
              {detail.invitesReceived.map((invite) => (
                <ListItem key={invite._id} divider secondaryAction={<Button size="small" color="error" disabled={busy} onClick={() => ask('Decline the invitation?', `The invitation from ${invite.inviterName} is declined.`, 'Decline', () => on.declineInvite(invite._id))}>Decline</Button>}>
                  From&nbsp;<Link href={`/member/${invite.infamily}`}>{invite.inviterName}</Link>
                </ListItem>
              ))}
            </List>
          </TabPart>
        )}
        {!detail.payer && !patron && detail.invitesReceived.length === 0 && <TabToolbar note="Not part of a family." />}
      </Panel>

      {!member.infamily && (
        <Panel tab="memberships" shown={shown}>
          <TabToolbar><Button size="small" variant="outlined" href={`/memberships/add?member=${member._id}`}>Add membership</Button></TabToolbar>
          <DataList rows={detail.memberships} columns={membershipColumns} empty="No memberships." defaultSort={{ field: 'start', sort: 'desc' }} rowHref={(ms) => `/membership/${ms._id}`} />
        </Panel>
      )}
      {!member.infamily && <Panel tab="messages" shown={shown}>{messages}</Panel>}
      <Panel tab="comments" shown={shown}>{comments}</Panel>
      <Panel tab="certificates" shown={shown}>{certificates}</Panel>

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
