import React from 'react';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

/** A green box for what holds, a red one for what has ended. */
const Panel = ({ current, title, children }) => (
  <Paper variant="outlined" sx={{
    p: 1.5, textAlign: 'center', maxWidth: 600, borderWidth: 4, borderRadius: 2.5,
    borderColor: current ? 'success.main' : 'error.main', bgcolor: current ? '#d3ffd3' : '#ffeded',
  }}>
    <Typography variant="h5" component="h2" sx={{ mb: 0.5 }}>{title}</Typography>
    {children}
  </Paper>
);

/**
 * A member's public status page: whether they are a member and have lab
 * access, until when, and their storage box. For a link that leads to no
 * member, says so and points back to the search.
 *
 * @param {{ status?: { member: boolean, info: object }, now?: Date, searchPath: string, appUrl?: string }} props
 *   No `status` while it is being looked up.
 */
export const MemberStatus = ({ status, now = new Date(), searchPath, appUrl = 'https://app.uppsalamakerspace.se/storage' }) => {
  if (!status) return null;
  if (!status.member) {
    return (
      <Box sx={{ mt: 5 }}>
        <Panel current={false} title="No member with this id">
          <Typography variant="body2" sx={{ mb: 1 }}>
            I am sorry, this link does not correspond to a member. Either your link is old or you did not provide an email
            and member id that corresponds to a member in Uppsala Makerspace.
          </Typography>
          <Typography variant="body2">You can go back <Link href={searchPath} target="_top">to the member search page</Link> and try again.</Typography>
        </Panel>
      </Box>
    );
  }
  const { info } = status;
  const member = new Date(info.member) > now;
  const lab = new Date(info.lab) > now;
  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h4" component="h1">Name: <strong>{info.name}</strong></Typography>
      <Typography>Member id: <strong>{info.id}</strong></Typography>
      <Divider sx={{ my: 2 }} />
      <Stack spacing={2.5} sx={{ mt: 5 }}>
        <Panel current={member} title={member ? 'Member' : 'No membership'}>
          {member ? 'Member until ' : 'Membership ended '}<strong>{info.member}</strong>
        </Panel>
        <Panel current={lab} title={lab ? 'Lab access' : 'No lab access'}>
          {lab ? 'Access until ' : 'Access ended '}<strong>{info.lab}</strong>
        </Panel>
        {lab && (
          <Box sx={{ textAlign: 'center', maxWidth: 600 }}>
            <Typography variant="h5" component="h2">Storage box</Typography>
            {info.storage && <Typography>Storage box number: {info.storage}</Typography>}
            {!info.infamily && (
              <Typography variant="body2">Storage queue and preferences are managed in the <Link href={appUrl} target="_top">member app</Link>.</Typography>
            )}
          </Box>
        )}
      </Stack>
    </Box>
  );
};
