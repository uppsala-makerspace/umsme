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
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { GrantForm } from './GrantForm';
import { HolderList } from './HolderList';

/**
 * A member's certificates on their page: what they hold or asked for, a form
 * to grant one more, and their test attempts, which can be reset.
 *
 * @param {{ attestations: object[]|null, certificates: Array<{ value, label, validityDays? }>,
 *           search: (query) => Promise<object[]>, defaultCertifier?: object|null,
 *           onGrant: (grant) => Promise<boolean>, onRevoke: (attestationId) => void,
 *           attempts?: Array<{ certificateId, certificateName, testId, count, lastState }>|null,
 *           onResetAttempts?: (certificateId) => void, busy?: boolean, error?: string }} props
 *   `attempts` is null when the user may not see them.
 */
export const MemberCertificates = ({
  attestations, certificates, search, defaultCertifier, onGrant, onRevoke, attempts, onResetAttempts, busy = false, error,
}) => {
  const [resetting, setResetting] = useState(null);
  return (
    <Box component="section" sx={{ mt: 2 }}>
      <Typography variant="h5" component="h2" sx={{ mb: 1 }}>Certificates</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Box sx={{ mb: 2 }}>
        <GrantForm choose="certificate" certificates={certificates} search={search} defaultCertifier={defaultCertifier} onGrant={onGrant} busy={busy} />
      </Box>
      <HolderList show="certificate" rows={attestations} onRevoke={onRevoke} busy={busy} />
      {attempts?.length > 0 && (
        <>
          <Typography variant="h6" component="h3" sx={{ mt: 3, mb: 1 }}>Test attempts</Typography>
          <Table size="small">
            <TableHead>
              <TableRow><TableCell>Certificate</TableCell><TableCell>Test id</TableCell><TableCell>Attempts</TableCell><TableCell>Last state</TableCell><TableCell /></TableRow>
            </TableHead>
            <TableBody>
              {attempts.map((a) => (
                <TableRow key={a.certificateId}>
                  <TableCell><Link href={`/certificate/${a.certificateId}`}>{a.certificateName}</Link></TableCell>
                  <TableCell><code>{a.testId}</code></TableCell>
                  <TableCell>{a.count}</TableCell>
                  <TableCell>{a.lastState}</TableCell>
                  <TableCell align="right"><Button size="small" color="warning" disabled={busy} onClick={() => setResetting(a)}>Reset attempts</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}
      <Dialog open={!!resetting} onClose={() => setResetting(null)}>
        <DialogTitle>Reset the test attempts?</DialogTitle>
        <DialogContent>
          <DialogContentText>All attempts at {resetting?.certificateName} are removed, and so is an attestation the test granted.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetting(null)}>Cancel</Button>
          <Button color="warning" variant="contained" onClick={() => { onResetAttempts(resetting.certificateId); setResetting(null); }}>Reset attempts</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
