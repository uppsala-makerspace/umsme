import React, { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

/**
 * A new account: a username and a password.
 *
 * @param {{ onAdd: (username, password) => void, busy?: boolean, error?: string }} props
 */
export const UserAdd = ({ onAdd, busy = false, error }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  return (
    <Box component="form" sx={{ maxWidth: 500 }} onSubmit={(e) => { e.preventDefault(); onAdd(username.trim(), password); }}>
      <Typography variant="h4" component="h1" sx={{ mb: 2 }}>Add user</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Stack spacing={2}>
        <TextField label="Username" required value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="off" />
        <TextField label="Password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        <Box><Button type="submit" variant="contained" disabled={busy || !username.trim() || !password}>Add user</Button></Box>
      </Stack>
    </Box>
  );
};
