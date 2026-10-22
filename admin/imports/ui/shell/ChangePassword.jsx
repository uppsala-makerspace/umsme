import React, { useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';

/**
 * Changing your own password: the current one and the new one twice.
 *
 * @param {{ open: boolean, onClose: () => void, onChange: (current, next) => Promise<void> }} props
 *   `onChange` rejects with the reason when the change fails.
 */
export const ChangePassword = ({ open, onClose, onChange }) => {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const close = () => { setCurrent(''); setNext(''); setAgain(''); setMessage(null); onClose(); };
  const mismatch = again && next !== again;
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await onChange(current, next);
      setCurrent(''); setNext(''); setAgain('');
      setMessage({ severity: 'success', text: 'Your password has been changed.' });
    } catch (err) {
      setMessage({ severity: 'error', text: err.reason || err.message });
    }
    setBusy(false);
  };
  return (
    <Dialog open={open} onClose={close} maxWidth="xs" fullWidth>
      <form onSubmit={submit}>
        <DialogTitle>Change password</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {message && <Alert severity={message.severity}>{message.text}</Alert>}
            <TextField label="Current password" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
            <TextField label="New password" type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
            <TextField label="New password again" type="password" value={again} onChange={(e) => setAgain(e.target.value)} autoComplete="new-password"
              error={!!mismatch} helperText={mismatch ? 'Not the same as the new password' : undefined} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={close}>Close</Button>
          <Button type="submit" variant="contained" disabled={busy || !current || !next || next !== again}>Change password</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
