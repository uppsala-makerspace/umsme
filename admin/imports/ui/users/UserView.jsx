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
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

const ROLES = [['admin', 'admin'], ['board', 'board'], ['treasurer', 'treasurer'], ['storage', 'storage']];

/**
 * A user account: its username and email (saved with Save), the member it
 * is, its admin roles and a new password (both at once), and deleting it.
 *
 * @param {{ detail: object, values: { username, email }, onChange: (field, value) => void, onSave: () => void,
 *           busy?: boolean, error?: string, notice?: string,
 *           on: { setRole: (role, on) => void, setPassword: (password) => Promise<boolean>, remove: () => void },
 *           after?: React.ReactNode }} props
 *   `detail` as users.detail returns it: user, roles, member, canSetRoles, self.
 */
export const UserView = ({ detail, values, onChange, onSave, busy = false, error, notice, on, after }) => {
  const { user, roles, member, canSetRoles, self } = detail;
  const [password, setPassword] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState(null);
  const [asking, setAsking] = useState(false);
  const adminLogin = user.username === 'admin';
  const reset = async () => {
    setConfirming(false);
    if (await on.setPassword(password)) {
      setPassword('');
      setPasswordMessage({ severity: 'success', text: 'The password has been changed and the user logged out everywhere.' });
    }
  };
  return (
    <Box sx={{ maxWidth: 800 }}>
      <Link href="/users" underline="hover" variant="body2">← Users</Link>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mt: 0.5, mb: 1 }}>
        <Typography variant="h4" component="h1">User <strong>{user.username || user.emails?.[0]?.address}</strong></Typography>
        {!self && <Button color="error" variant="outlined" disabled={busy} onClick={() => setAsking(true)}>Delete user</Button>}
      </Stack>
      {member && <Typography sx={{ mb: 2 }}><Link href={`/member/${member._id}`}>Member: {member.name}</Link></Typography>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 2 }}>{notice}</Alert>}

      <Box component="form" onSubmit={(e) => { e.preventDefault(); onSave(); }}>
        <Stack spacing={2} sx={{ maxWidth: 500 }}>
          <TextField label="Username" value={values.username} onChange={(e) => onChange('username', e.target.value)} autoComplete="off" />
          <TextField label="Email" type="email" value={values.email} onChange={(e) => onChange('email', e.target.value)} autoComplete="off"
            helperText={user.emails?.[0] && !user.emails[0].verified ? 'Not verified' : undefined} />
          <Box><Button type="submit" variant="contained" disabled={busy}>Save</Button></Box>
        </Stack>
      </Box>

      <Typography variant="h5" component="h2" sx={{ mt: 4, mb: 1 }}>Roles</Typography>
      {adminLogin
        ? <Typography variant="body2" color="text.secondary">The admin login keeps its roles.</Typography>
        : (
          <>
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
              {ROLES.map(([role, label]) => (roles.includes(role)
                ? <Button key={role} variant="contained" color="success" size="small" disabled={busy || !canSetRoles} onClick={() => on.setRole(role, false)}>Remove from {label}</Button>
                : <Button key={role} variant="outlined" size="small" disabled={busy || !canSetRoles} onClick={() => on.setRole(role, true)}>Add to {label}</Button>))}
            </Stack>
            {!canSetRoles && <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Only admins give and take roles.</Typography>}
          </>
        )}

      <Typography variant="h5" component="h2" sx={{ mt: 4, mb: 1 }}>Password</Typography>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start', maxWidth: 600 }}>
        <TextField label="New password" type="password" size="small" value={password} autoComplete="new-password"
          onChange={(e) => { setPassword(e.target.value); setConfirming(false); setPasswordMessage(null); }}
          helperText="Sets a new password for this user and logs them out everywhere." sx={{ flex: 1 }} />
        {confirming
          ? <><Button variant="contained" color="warning" disabled={busy} onClick={reset}>Yes, set the new password</Button><Button onClick={() => setConfirming(false)}>Cancel</Button></>
          : <Button variant="outlined" disabled={busy} onClick={() => (password ? setConfirming(true) : setPasswordMessage({ severity: 'warning', text: 'Enter a new password first.' }))}>Reset password</Button>}
      </Stack>
      {passwordMessage && <Alert severity={passwordMessage.severity} sx={{ mt: 1, maxWidth: 600 }}>{passwordMessage.text}</Alert>}

      {after && <Box sx={{ mt: 4 }}>{after}</Box>}

      <Dialog open={asking} onClose={() => setAsking(false)}>
        <DialogTitle>Delete this user?</DialogTitle>
        <DialogContent><DialogContentText>The account can no longer log in, and the comments about it are deleted. The member, if any, stays.</DialogContentText></DialogContent>
        <DialogActions>
          <Button onClick={() => setAsking(false)}>Keep</Button>
          <Button variant="contained" color="error" onClick={() => { setAsking(false); on.remove(); }}>Delete user</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
