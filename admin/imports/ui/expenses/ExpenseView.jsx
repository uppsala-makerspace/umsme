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
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { isPdf } from '/imports/common/lib/expenseType';
import { STATUS_COLOR, statusText, kr, isoDay } from './labels';
import { DateField } from '../components/DateField';

const native = { select: { native: true }, inputLabel: { shrink: true } };
const Row = ({ label, children }) => (
  <TableRow><TableCell component="th" sx={{ width: 190, fontWeight: 700, verticalAlign: 'top' }}>{label}</TableCell><TableCell>{children ?? <em>—</em>}</TableCell></TableRow>
);

/**
 * One expense: what it is, who to pay and how, the receipt, and what can be
 * done with it now: confirm or reject a submitted one, reimburse (or pay) a
 * confirmed one, or undo either.
 *
 * @param {{ expense: object, payee?: object, receipt?: string|null, accountOptions: Array<{ account, name }>,
 *           busy?: boolean, error?: string, today: string,
 *           onConfirm: () => void, onUnconfirm: () => void, onReject: (reason) => void,
 *           onReimburse: (account, day) => void, onUnreimburse: () => void }} props
 *   `payee` as expenses.payee returns it; `receipt` undefined while it is fetched, null if there is none.
 */
export const ExpenseView = ({
  expense, payee, receipt, accountOptions, busy = false, error, today, onConfirm, onUnconfirm, onReject, onReimburse, onUnreimburse,
}) => {
  const [asking, setAsking] = useState(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [account, setAccount] = useState(expense.bookkeepingAccount || '');
  const [day, setDay] = useState(expense.reimbursedDate ? isoDay(expense.reimbursedDate) : today);
  const [zoom, setZoom] = useState(null);
  const invoice = expense.type === 'invoice';
  const accountLabel = (acc) => {
    const option = accountOptions.find((o) => o.account === acc);
    return option ? `${acc} — ${option.name}` : acc;
  };
  const ask = (title, text, confirmLabel, then) => setAsking({ title, text, confirmLabel, then });

  return (
    <Box>
      <Link href="/expenses" underline="hover" variant="body2">← Expenses</Link>
      <Typography variant="h4" component="h1" sx={{ mt: 0.5, mb: 2 }}>
        {invoice ? 'Invoice' : 'Expense'} <Chip size="small" color={STATUS_COLOR[expense.status] || 'default'} label={statusText(expense)} sx={{ verticalAlign: 'middle' }} />
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
        <Box sx={{ flex: 1 }}>
          <Table size="small">
            <TableBody>
              <Row label="Member">{payee && <Link href={`/member/${expense.memberId}`} target="_blank">{payee.memberName}&nbsp;↗</Link>}</Row>
              <Row label="Type">{invoice ? <><Chip size="small" color="warning" label="Invoice" /> the association pays the supplier</> : 'Receipt — reimburse the member'}</Row>
              <Row label={invoice ? 'Invoice date' : 'Date'}>{isoDay(expense.date)}</Row>
              {invoice && <Row label="Due date">{expense.dueDate ? <strong>{isoDay(expense.dueDate)}</strong> : null}</Row>}
              <Row label="Amount">{expense.amount ? kr(expense.amount) : null}</Row>
              <Row label="Account">{payee?.accountName || '—'}{payee?.accountDimensions && <Typography component="span" variant="body2" color="text.secondary"> [{payee.accountDimensions}]</Typography>}</Row>
              <Row label={invoice ? 'Supplier' : 'Place'}>{expense.place || null}</Row>
              <Row label="Note">{expense.note || null}</Row>
              <Row label="Created">{isoDay(expense.createdAt)}</Row>
              {expense.bookkeepingAccount && <Row label="Bookkeeping account"><code>{accountLabel(expense.bookkeepingAccount)}</code></Row>}
              {expense.reimbursedDate && <Row label={invoice ? 'Payment date' : 'Reimbursed date'}>{isoDay(expense.reimbursedDate)}</Row>}
              <Row label={invoice ? 'Pay to' : 'Bank account'}>
                {invoice ? <em>the supplier, using the payment details on the invoice</em>
                  : payee?.bank ? (
                    <>
                      {payee.bank.name && <><strong>{payee.bank.name}</strong> — </>}clearing <code>{payee.bank.clearing}</code>, account <code>{payee.bank.number}</code>
                      {payee.bank.holder && <Box sx={{ mt: 0.5 }}>account holder: <strong>{payee.bank.holder}</strong></Box>}
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>combined: <code>{payee.bank.combined}</code> <small>(verify format in your bank)</small></Typography>
                    </>
                  ) : <em>no bank account on file</em>}
              </Row>
            </TableBody>
          </Table>

          {expense.rejectionReason && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              <strong>Rejection reason:</strong> {expense.rejectionReason}
              {expense.rejectedAt && (
                <Box sx={{ mt: 0.5 }}>
                  Rejected by {expense.rejectedBy ? <Link href={`/member/${expense.rejectedBy}`}>{payee?.rejectedByName}</Link> : <em>admin</em>} on {isoDay(expense.rejectedAt)}
                </Box>
              )}
            </Alert>
          )}

          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            {expense.status === 'submitted' && (
              <Button variant="contained" color="success" disabled={busy} onClick={() => ask('Confirm this expense?', 'The expense can then be reimbursed.', 'Confirm', onConfirm)}>Confirm</Button>
            )}
            {expense.status === 'confirmed' && (
              <Button variant="outlined" disabled={busy}
                onClick={() => ask('Undo the confirmation?', 'The expense goes back to submitted and must be confirmed again, here or by an approver in the app.', 'Undo the confirmation', onUnconfirm)}>
                Undo confirmation
              </Button>
            )}
            {['submitted', 'confirmed'].includes(expense.status) && <Button color="error" variant="outlined" disabled={busy} onClick={() => setRejecting(true)}>Reject…</Button>}
            {expense.status === 'reimbursed' && (
              <Button variant="outlined" disabled={busy} onClick={() => ask('Move this expense back to confirmed?', `It is no longer marked as ${invoice ? 'paid' : 'reimbursed'}.`, 'Move back', onUnreimburse)}>
                Undo &quot;mark as {invoice ? 'paid' : 'reimbursed'}&quot;
              </Button>
            )}
          </Stack>

          {rejecting && (
            <Paper variant="outlined" sx={{ mt: 2, p: 2 }}>
              <TextField label="Reason for rejection (the member will see this)" multiline minRows={3} fullWidth value={reason} onChange={(e) => setReason(e.target.value)} />
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <Button color="error" variant="contained" disabled={busy || !reason.trim()} onClick={() => { onReject(reason.trim()); setRejecting(false); }}>Reject expense</Button>
                <Button onClick={() => setRejecting(false)}>Cancel</Button>
              </Stack>
            </Paper>
          )}

          {expense.status === 'confirmed' && (
            <Paper variant="outlined" sx={{ mt: 2, p: 2 }}>
              <Stack spacing={2}>
                <TextField label="Bookkeeping account" select slotProps={native} value={account} onChange={(e) => setAccount(e.target.value)}>
                  <option value="">— select account —</option>
                  {accountOptions.map((o) => <option key={o.account} value={o.account}>{o.account} — {o.name}</option>)}
                </TextField>
                <DateField label={invoice ? 'Payment date' : 'Reimbursement date'} value={day} onChange={setDay} />
                <Box>
                  <Button variant="contained" color="success" disabled={busy || !account || !day}
                    onClick={() => ask(invoice ? 'Mark this invoice as paid?' : 'Mark this expense as reimbursed?', `Booked on ${accountLabel(account)}, ${day}.`, `Mark as ${invoice ? 'paid' : 'reimbursed'}`, () => onReimburse(account, day))}>
                    Mark as {invoice ? 'paid' : 'reimbursed'}
                  </Button>
                </Box>
              </Stack>
            </Paper>
          )}
        </Box>

        <Box sx={{ flex: 1 }}>
          {receipt === undefined ? <Typography color="text.secondary">Loading receipt…</Typography>
            : !receipt ? <Typography color="text.secondary">No receipt to show.</Typography>
              : isPdf(expense.mimeType)
                ? <Button variant="outlined" size="large" href={receipt} target="_blank" rel="noreferrer">Open PDF {invoice ? 'invoice' : 'receipt'}&nbsp;↗</Button>
                : <Box component="img" src={receipt} alt="Receipt" title="Click to enlarge" onClick={() => setZoom('fit')} sx={{ maxWidth: '100%', border: 1, borderColor: 'divider', cursor: 'zoom-in' }} />}
        </Box>
      </Stack>

      {zoom && (
        <Box onClick={() => setZoom(null)} sx={{ position: 'fixed', inset: 0, bgcolor: 'rgba(0,0,0,0.85)', zIndex: 1300, overflow: 'auto', textAlign: 'center' }}>
          <Button variant="contained" color="inherit" onClick={() => setZoom(null)} sx={{ position: 'fixed', top: 15, right: 15 }}>Close ✕</Button>
          <Box component="img" src={receipt} alt="Receipt" onClick={(e) => { e.stopPropagation(); setZoom(zoom === 'fit' ? 'full' : 'fit'); }}
            sx={zoom === 'fit' ? { maxWidth: '100%', maxHeight: '100vh', cursor: 'zoom-in' } : { maxWidth: 'none', cursor: 'zoom-out' }} />
        </Box>
      )}

      <Dialog open={!!asking} onClose={() => setAsking(null)}>
        <DialogTitle>{asking?.title}</DialogTitle>
        <DialogContent><DialogContentText>{asking?.text}</DialogContentText></DialogContent>
        <DialogActions>
          <Button onClick={() => setAsking(null)}>Cancel</Button>
          <Button variant="contained" onClick={() => { const { then } = asking; setAsking(null); then(); }}>{asking?.confirmLabel}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
