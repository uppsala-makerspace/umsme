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
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { MemberSelect } from '../components/MemberSelect';
import { STATUS, day } from './labels';
import { dateTime } from '../dates';
import { storeItemPath } from '../storeItems/paths';

const Facts = ({ rows }) => (
  <Table size="small" sx={{ maxWidth: 700, mb: 2 }}>
    <TableBody>
      {rows.filter(([, value]) => value !== undefined && value !== null && value !== '').map(([label, value]) => (
        <TableRow key={label}><TableCell component="th" sx={{ width: 180, fontWeight: 700 }}>{label}</TableCell><TableCell>{value}</TableCell></TableRow>
      ))}
    </TableBody>
  </Table>
);

const membershipFacts = (ms) => [
  ['Amount', ms.amount], ['Start', day(ms.start)], ['Type', ms.type], ['Discount', ms.discount ? 'Yes' : 'No'],
  ['Family', ms.family ? 'Yes' : 'No'], ['Membership end', day(ms.memberend)], ['Lab membership end', day(ms.labend)],
];

/**
 * A payment and its filing: whose it is, whether it is for a membership,
 * and which; or the item a webshop purchase paid for. Every change takes
 * effect at once.
 *
 * @param {{ detail: object, busy?: boolean, error?: string, search: (query) => Promise<object[]>,
 *           on: { assign, unassign, setOther, link, unlink, newMembership, remove } }} props
 *   `detail` as payments.detail returns it.
 */
export const PaymentView = ({ detail, busy = false, error, search, on, comments }) => {
  const { payment, member, membership, initiatedPayment, storeItem, linkable } = detail;
  const [asking, setAsking] = useState(null);
  const [chosen, setChosen] = useState(null);
  const ask = (title, text, confirmLabel, then) => setAsking({ title, text, confirmLabel, then });
  const purchase = payment.kind === 'purchase';
  return (
    <Box sx={{ maxWidth: 1000 }}>
      <Link href="/payments" underline="hover" variant="body2">← Payments</Link>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mt: 0.5, mb: 2 }}>
        <Typography variant="h4" component="h1">
          Payment <Chip size="small" color={STATUS[payment.kind].color} label={STATUS[payment.kind].label} sx={{ verticalAlign: 'middle' }} />
        </Typography>
        <Button color="error" variant="outlined" disabled={busy}
          onClick={() => (membership
            ? ask('The payment can not be deleted', 'It is connected to a membership; disconnect it first.', null, null)
            : ask('Delete this payment?', 'The payment is deleted for good, with the initiated payment behind it, if any.', 'Delete', on.remove))}>
          Delete payment
        </Button>
      </Stack>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Facts rows={[
        ['Type', payment.type], ['Amount', payment.amount], ['Date', day(payment.date)], ['Message', payment.message], ['Name', payment.name],
        ['Mobile', payment.mobile], ['Clarification', payment.clarification], ['External ID', payment.externalId], ['Buyer comment', payment.comment],
      ]} />
      {initiatedPayment && (
        <>
          <Typography variant="h5" component="h2">Initiated payment</Typography>
          <Facts rows={Object.entries(initiatedPayment).filter(([k]) => !['_id', 'member'].includes(k)).map(([k, v]) => [k, v instanceof Date ? dateTime(v) : String(v)])} />
        </>
      )}

      {purchase ? (
        <>
          <Typography variant="h5" component="h2">Webshop purchase{storeItem && <>: <strong><Link href={storeItemPath(storeItem._id, 'purchases')}>{storeItem.name?.sv || storeItem.code}</Link></strong></>}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Classified by the item it paid for, so there is nothing to file by hand here: no membership to connect, and the buyer is already known.
          </Typography>
        </>
      ) : (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
          <Typography>{payment.other ? 'Not a membership payment' : 'Membership payment'}</Typography>
          <Button size="small" variant="outlined" disabled={busy || (!payment.other && !!membership)} onClick={() => on.setOther(!payment.other)}>
            {payment.other ? 'Mark as membership payment' : 'Mark as other purpose'}
          </Button>
        </Stack>
      )}

      {member ? (
        <>
          <Typography variant="h5" component="h2" sx={{ mt: 2 }}>
            Connected to member: <strong><Link href={`/member/${member._id}`}>{member.name}</Link></strong>
            {!purchase && <Button size="small" sx={{ ml: 1 }} disabled={busy} onClick={() => ask('Disconnect the member?', 'The member stays; the payment is no longer theirs, nor their membership’s.', 'Disconnect member', on.unassign)}>Disconnect member</Button>}
          </Typography>
          {!purchase && !payment.other && (membership ? (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h5" component="h2">
                <Link href={`/membership/${membership._id}`}>Connected membership</Link>
                <Button size="small" sx={{ ml: 1 }} disabled={busy} onClick={() => ask('Disconnect the membership?', 'The membership stays, and is still the member’s.', 'Disconnect', on.unlink)}>Disconnect</Button>
              </Typography>
              <Facts rows={membershipFacts(membership)} />
            </Box>
          ) : (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h5" component="h2" sx={{ mb: 1 }}>
                Connect to membership <Button size="small" variant="outlined" sx={{ ml: 1 }} disabled={busy} onClick={on.newMembership}>New membership</Button>
              </Typography>
              {linkable.length === 0
                ? <Typography variant="body2" color="text.secondary">The member has no membership without a payment.</Typography>
                : (
                  <List dense disablePadding>
                    {linkable.map((ms) => (
                      <ListItem key={ms._id} divider secondaryAction={<Button size="small" disabled={busy} onClick={() => on.link(ms._id)}>Connect</Button>}>
                        {day(ms.start)} · {ms.type} · {ms.amount} kr · until {day(ms.memberend || ms.labend)}
                      </ListItem>
                    ))}
                  </List>
                )}
            </Box>
          ))}
        </>
      ) : (
        <Box sx={{ mt: 2 }}>
          <Typography variant="h5" component="h2" sx={{ mb: 1 }}>Connect to member <Link href={`/members/add?payment=${payment._id}`} variant="body2" sx={{ ml: 1 }}>Add new</Link></Typography>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start', maxWidth: 700 }}>
            <Box sx={{ flex: 1 }}><MemberSelect label="Member" value={chosen} onChange={setChosen} search={search} /></Box>
            <Button variant="contained" sx={{ mt: 1 }} disabled={busy || !chosen} onClick={() => on.assign(chosen._id)}>Connect</Button>
          </Stack>
        </Box>
      )}

      {comments && <Box sx={{ mt: 4 }}>{comments}</Box>}

      <Dialog open={!!asking} onClose={() => setAsking(null)}>
        <DialogTitle>{asking?.title}</DialogTitle>
        <DialogContent><DialogContentText>{asking?.text}</DialogContentText></DialogContent>
        <DialogActions>
          <Button onClick={() => setAsking(null)}>{asking?.then ? 'Cancel' : 'Close'}</Button>
          {asking?.then && <Button variant="contained" color="error" onClick={() => { const { then } = asking; setAsking(null); then(); }}>{asking.confirmLabel}</Button>}
        </DialogActions>
      </Dialog>
    </Box>
  );
};
