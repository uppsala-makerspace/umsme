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

/**
 * A group mail: who it was from and to, its text, who did not get it, the
 * announcement it was for (or making one of it), and deleting it. While it
 * goes out, how far it has come; one sent for an announcement stays.
 *
 * @param {{ detail: { mail: object, announcement: object|null }, busy?: boolean, error?: string,
 *           on: { toAnnouncement: () => void, remove: () => void }, after?: React.ReactNode }} props
 */
export const MailView = ({ detail, busy = false, error, on, after }) => {
  const { mail, announcement } = detail;
  const [asking, setAsking] = useState(false);
  const sending = mail.status === 'sending';
  const facts = [['From', mail.from], ['Recipients', groupLabel(mail.recipients)], ['Family members', mail.family ? 'Included' : 'Not included'], ['Sent', sentAt(mail.senddate)], ['Subject', mail.subject]];
  return (
    <Box sx={{ maxWidth: 1000 }}>
      <Link href="/mail" underline="hover" variant="body2">← Sent mails</Link>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mt: 0.5, mb: 1 }}>
        <Typography variant="h4" component="h1">Sent mail <strong>{mail.subject}</strong></Typography>
        {!announcement && !sending && <Button color="error" variant="outlined" disabled={busy} onClick={() => setAsking(true)}>Delete</Button>}
      </Stack>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {sending && <Progress job={{ _id: mail._id, subject: mail.subject, total: mail.total, sent: mail.to?.length || 0, failed: mail.failed?.length || 0 }} />}
      {mail.status === 'interrupted' && (
        <Alert severity="warning" sx={{ mb: 2 }}>The server stopped before the mail had gone out to everyone: {(mail.to?.length || 0) + (mail.failed?.length || 0)} of {mail.total} were done. The rest did not get it.</Alert>
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
