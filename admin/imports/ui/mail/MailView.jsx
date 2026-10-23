import React, { useState } from 'react';
import { marked } from 'marked';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
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
import Typography from '@mui/material/Typography';
import { Addresses } from './Addresses';
import { Progress } from './Progress';
import { groupLabel, sentAt } from './labels';
import { FORM_WIDTH } from '../components/PageTabs';

/**
 * A group mail: who it was from and to, its text, who did not get it, the
 * announcement it was for (or making one of it), and deleting it. While it
 * goes out, how far it has come; when it has failed for some, a dialog asks
 * whether to try them again or settle for it (OK). One sent for an
 * announcement stays.
 *
 * @param {{ detail: { mail: object, announcement: object|null }, busy?: boolean, error?: string,
 *           on: { toAnnouncement, remove, retry, accept }, after?: React.ReactNode }} props
 */
export const MailView = ({ detail, busy = false, error, on, after }) => {
  const { mail, announcement } = detail;
  const [asking, setAsking] = useState(false);
  const sending = mail.status === 'sending' || mail.status === 'review';
  const [deciding, setDeciding] = useState(true);
  const facts = [['From', mail.from], ['Recipients', groupLabel(mail.recipients)], ['Family members', mail.family ? 'Included' : 'Not included'], ['Sent', sentAt(mail.senddate)], ['Subject', mail.subject]];
  return (
    <Box sx={{ maxWidth: FORM_WIDTH }}>
      <Link href="/mail" underline="hover" variant="body2">← Sent mails</Link>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mt: 0.5, mb: 1 }}>
        <Typography variant="h4" component="h1">Sent mail <strong>{mail.subject}</strong></Typography>
        {!announcement && !sending && <Button color="error" variant="outlined" disabled={busy} onClick={() => setAsking(true)}>Delete</Button>}
      </Stack>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {mail.status === 'sending' && <Progress job={{ _id: mail._id, subject: mail.subject, total: mail.total, sent: mail.to?.length || 0, failed: mail.failed?.length || 0 }} />}
      {mail.status === 'review' && (
        <Alert severity="warning" sx={{ mb: 2 }} action={<Button color="inherit" size="small" onClick={() => setDeciding(true)}>Decide</Button>}>
          The mail could not be sent to {mail.failed.length} of {mail.total}. Try them again, or settle for it with OK; no other mail can be sent until then.
        </Alert>
      )}
      <Box sx={{ mb: 2 }}>
        {announcement
          ? <Link href={`/announcement/${announcement._id}`}>View announcement: {announcement.subjectSv} →</Link>
          : !sending && <Button variant="outlined" size="small" disabled={busy} onClick={on.toAnnouncement}>Extract into announcement</Button>}
      </Box>
      <Table size="small" sx={{ maxWidth: 700, mb: 2 }}>
        <TableBody>
          {facts.map(([label, value]) => (
            <TableRow key={label}><TableCell component="th" sx={{ width: 160, fontWeight: 700 }}>{label}</TableCell><TableCell>{value}</TableCell></TableRow>
          ))}
        </TableBody>
      </Table>
      <Typography variant="h5" component="h2" sx={{ mb: 1 }}>Text{mail.formatted ? ' (formatted)' : ''}</Typography>
      <Paper variant="outlined" sx={{ p: 2, mb: 3, overflowX: 'auto' }}>
        {mail.formatted
          ? <Box className="markdown" dangerouslySetInnerHTML={{ __html: marked.parse(mail.template || '', { breaks: true }) }} />
          : <Box component="pre" sx={{ m: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit', border: 0, background: 'none', p: 0 }}>{mail.template}</Box>}
      </Paper>
      <Typography variant="h5" component="h2" sx={{ mb: 1 }}>Sent to {mail.to?.length || 0}</Typography>
      <Addresses addresses={mail.to || []} empty="Nobody." />
      {mail.failed?.length > 0 && (
        <>
          <Typography variant="h5" component="h2" sx={{ mt: 3, mb: 1 }}>Failed for {mail.failed.length}</Typography>
          <Addresses addresses={mail.failed} />
        </>
      )}
      {after && <Box sx={{ mt: 4 }}>{after}</Box>}

      <Dialog open={mail.status === 'review' && deciding} onClose={() => setDeciding(false)} maxWidth="sm" fullWidth>
        <DialogTitle>The mail could not be sent to {mail.failed?.length}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 1.5 }}>Try again sends it to them once more. OK settles for it: the mail is sent{announcement ? ', and so is the announcement' : ''}, and they stay on record as failed.</DialogContentText>
          <Addresses addresses={mail.failed || []} />
        </DialogContent>
        <DialogActions>
          <Button disabled={busy} onClick={() => { setDeciding(false); on.accept(); }}>OK</Button>
          <Button variant="contained" disabled={busy} onClick={() => { setDeciding(true); on.retry(); }}>Try again</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={asking} onClose={() => setAsking(false)}>
        <DialogTitle>Delete this mail?</DialogTitle>
        <DialogContent><DialogContentText>The record of the mail is deleted, with its comments. The mails already delivered stay delivered.</DialogContentText></DialogContent>
        <DialogActions>
          <Button onClick={() => setAsking(false)}>Keep</Button>
          <Button variant="contained" color="error" onClick={() => { setAsking(false); on.remove(); }}>Delete mail</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
