import React, { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

/**
 * Bring the bank's latest deposits into Payments: sign in with BankID for a
 * personal number (scan the QR code), then synchronize.
 *
 * @param {{ pnr: string, onSavePnr: (pnr) => void, status: string, qr?: string, busy?: boolean,
 *           onSignIn: () => void, onSignOut: () => void, onSynchronize: () => void,
 *           result?: { added: number, total: number }, error?: string }} props
 *   `status` is the proxy's: 'uninitiated', 'waiting' or 'ready'; `qr` a base64 PNG.
 */
export const BankSync = ({ pnr, onSavePnr, status, qr, busy = false, onSignIn, onSignOut, onSynchronize, result, error }) => {
  const [value, setValue] = useState(pnr);
  useEffect(() => { setValue(pnr); }, [pnr]);
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h5" component="h2" sx={{ mb: 1 }}>Bank synchronization</Typography>
      <Stack component="form" direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }} onSubmit={(e) => { e.preventDefault(); onSavePnr(value.trim()); }}>
        <TextField label="Personal number" size="small" placeholder="Personal number" value={value} onChange={(e) => setValue(e.target.value)} />
        <Button type="submit" variant="outlined">Update / Save</Button>
      </Stack>
      {pnr && (
        <>
          <Typography variant="body2" sx={{ mb: 1 }}><strong>Bank signin status:</strong> {status}</Typography>
          {status === 'waiting' && qr && <Box component="img" src={`data:image/png;base64,${qr}`} alt="BankID QR code" sx={{ display: 'block', width: 200, mb: 1 }} />}
          <Stack direction="row" spacing={1}>
            {status === 'uninitiated' && <Button variant="contained" disabled={busy} onClick={onSignIn}>Sign in</Button>}
            {status === 'ready' && (
              <>
                <Button variant="outlined" disabled={busy} onClick={onSignOut}>Sign out</Button>
                <Button variant="contained" disabled={busy} onClick={onSynchronize}>Synchronize transactions</Button>
              </>
            )}
          </Stack>
          {result && <Alert severity="success" sx={{ mt: 1.5 }}>{result.added} new payments, {result.total} already there.</Alert>}
        </>
      )}
      {error && <Alert severity="error" sx={{ mt: 1.5 }}>{error}</Alert>}
    </Box>
  );
};
