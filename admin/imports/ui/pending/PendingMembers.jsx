import React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { MemberStatusChips } from '../members/MemberStatusChips';

/**
 * Members who have paid and wait for the board to accept them, each with
 * their status and what they have paid. Accepting welcomes them if an
 * automatic template fits.
 *
 * @param {{ members: object[]|null, onAccept: (memberId) => void, busy?: boolean, error?: string, notice?: string }} props
 */
export const PendingMembers = ({ members, onAccept, busy = false, error, notice }) => (
  <Box sx={{ maxWidth: 900 }}>
    <Typography variant="h4" component="h1" sx={{ mb: 2 }}>Pending members</Typography>
    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
    {notice && <Alert severity="success" sx={{ mb: 2 }}>{notice}</Alert>}
    {!members ? <Typography color="text.secondary">Loading…</Typography> : members.length === 0 ? <Typography>No pending members.</Typography> : (
      <Stack spacing={1.5}>
        {members.map((m) => (
          <Paper key={m._id} component="article" aria-label={m.name} variant="outlined" sx={{ p: 2 }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Typography variant="h6" component="h2">
                <Link href={`/member/${m._id}`}>{m.name}</Link>
                {m.userId && <Typography component="span" variant="body2"> | <Link href={`/user/${m.userId}`}>User account</Link></Typography>}
              </Typography>
              <Button variant="contained" color="success" size="small" disabled={busy} onClick={() => onAccept(m._id)}>Accept member</Button>
            </Stack>
            <Typography variant="body2" sx={{ mb: 1 }}>{m.email}</Typography>
            <MemberStatusChips member={m} />
            <Typography variant="body2" sx={{ mt: 1 }}>Total paid: <strong>{m.totalPaid} SEK</strong></Typography>
          </Paper>
        ))}
      </Stack>
    )}
  </Box>
);
