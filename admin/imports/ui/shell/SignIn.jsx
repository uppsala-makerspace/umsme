import React, { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';

/**
 * Signing in: username or email and password, or with Google when it is
 * set up.
 *
 * @param {{ onSignIn: (user, password) => void, onGoogle?: () => void, busy?: boolean, error?: string }} props
 */
export const SignIn = ({ onSignIn, onGoogle, busy = false, error }) => {
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  return (
    <Paper variant="outlined" sx={{ p: 3, maxWidth: 400 }}>
      <Box component="form" onSubmit={(e) => { e.preventDefault(); onSignIn(user.trim(), password); }}>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="Username or email" value={user} onChange={(e) => setUser(e.target.value)} autoComplete="username" autoFocus />
          <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          <Button type="submit" variant="contained" disabled={busy || !user.trim() || !password}>Sign in</Button>
          {onGoogle && (
            <>
              <Divider>or</Divider>
              <Button variant="outlined" disabled={busy} onClick={onGoogle}>Sign in with Google</Button>
            </>
          )}
        </Stack>
      </Box>
    </Paper>
  );
};
