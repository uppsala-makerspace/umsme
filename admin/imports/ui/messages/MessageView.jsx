import React, { useState } from 'react';
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
import Typography from '@mui/material/Typography';
import { memberPath } from '../members/paths';

/**
 * A message as it was sent, and deleting it.
 *
 * @param {{ message: object, memberName: string, onDelete: () => void, busy?: boolean, error?: string }} props
 */
export const MessageView = ({ message, memberName, onDelete, busy = false, error }) => {
  const [confirming, setConfirming] = useState(false);
  return (
    <Box sx={{ maxWidth: 900 }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1">Message sent to <Link href={memberPath(message.member, 'messages')}><strong>{memberName}</strong></Link></Typography>
        <Button color="error" variant="outlined" disabled={busy} onClick={() => setConfirming(true)}>Delete message</Button>
      </Stack>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {message.type} · sent {message.senddate ? new Date(message.senddate).toLocaleString('sv-SE') : '—'} to {message.to}
        {message.membership && <> · <Link href={`/membership/${message.membership}`}>membership</Link></>}
      </Typography>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6" component="p" sx={{ mb: 1 }}>{message.subject}</Typography>
        <Typography sx={{ whiteSpace: 'pre-wrap' }}>{message.messagetext}</Typography>
      </Paper>
      <Dialog open={confirming} onClose={() => setConfirming(false)}>
        <DialogTitle>Delete this message?</DialogTitle>
        <DialogContent><DialogContentText>The record of the message is deleted; the mail already sent stays sent. This cannot be undone.</DialogContentText></DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirming(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => { setConfirming(false); onDelete(); }}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
