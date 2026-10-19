import React, { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

const Card = ({ title, note, children, onSubmit }) => (
  <Paper variant="outlined" component="form" onSubmit={(e) => { e.preventDefault(); onSubmit(); }} sx={{ p: 2, borderWidth: 4, borderRadius: 2.5, bgcolor: 'grey.100' }}>
    <Typography variant="h5" component="h2" sx={{ mb: 0.5 }}>{title}</Typography>
    <Typography variant="body2" sx={{ mb: 2 }}>{note}</Typography>
    {children}
  </Paper>
);

const valid = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

/**
 * The public page where a member finds their membership status: by email
 * and member number, or by having the status mailed to them. Embedded on the
 * website, without a login.
 *
 * @param {{ onFind: (email, mid) => void, onMail: (email) => void, wrong?: boolean,
 *           mailedTo?: string, busy?: boolean }} props
 *   `wrong` says the last email and number did not match.
 */
export const FindStatus = ({ onFind, onMail, wrong = false, mailedTo, busy = false }) => {
  const [email, setEmail] = useState('');
  const [mid, setMid] = useState('');
  const [mailEmail, setMailEmail] = useState('');
  return (
    <Box sx={{ maxWidth: 600, mt: 3 }}>
      <Typography variant="h4" component="h1" sx={{ mb: 3 }}>Find out your membership status</Typography>
      <Card title="Check your status page" note="For security reasons you have to know both your email and member id." onSubmit={() => onFind(email.trim(), mid.trim())}>
        <Stack spacing={2}>
          <TextField label="Email" type="email" placeholder="Your email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <TextField label="Member id" type="number" placeholder="1234" value={mid} onChange={(e) => setMid(e.target.value)} />
          {wrong && <Alert severity="error">Wrong combination of email and member id.</Alert>}
          <Box sx={{ textAlign: 'right' }}>
            <Button type="submit" variant="contained" size="large" disabled={busy || !valid(email.trim()) || !mid.trim()}>Go to status page!</Button>
          </Box>
        </Stack>
      </Card>
      <Typography sx={{ my: 2.5, textAlign: 'center', fontWeight: 700 }}>&gt;&gt; Or, if you don&apos;t know your member id &lt;&lt;</Typography>
      <Card title="Mail me membership status" note="The mail will contain your membership status, your member id and a direct link to the status page for future reference."
        onSubmit={() => { onMail(mailEmail.trim()); setMailEmail(''); }}>
        <Stack spacing={2}>
          <TextField label="Email" type="email" placeholder="Your email" value={mailEmail} onChange={(e) => setMailEmail(e.target.value)} />
          {mailedTo && <Alert severity="info">An email was sent to <strong>{mailedTo}</strong> if a matching member could be found.</Alert>}
          <Box sx={{ textAlign: 'right' }}>
            <Button type="submit" variant="contained" size="large" disabled={busy || !valid(mailEmail.trim())}>Mail me status!</Button>
          </Box>
        </Stack>
      </Card>
    </Box>
  );
};
