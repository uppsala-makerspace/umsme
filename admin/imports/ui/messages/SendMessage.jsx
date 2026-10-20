import React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

/**
 * A message written from a template, to look over and change before it is
 * sent as a mail.
 *
 * @param {{ memberId: string, draft: { memberName, templateType }, values: { to, subject, messagetext },
 *           onChange: (field, value) => void, onSend: () => void, busy?: boolean, error?: string }} props
 */
export const SendMessage = ({ memberId, draft, values, onChange, onSend, busy = false, error }) => {
  const text = (name) => ({ value: values[name] || '', onChange: (e) => onChange(name, e.target.value) });
  return (
    <Box sx={{ maxWidth: 900 }}>
      <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
        Send <strong>{draft.templateType}</strong> message to member <Link href={`/member/${memberId}`}><strong>{draft.memberName}</strong></Link>
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>Could not send the message: {error}</Alert>}
      <Box component="form" onSubmit={(e) => { e.preventDefault(); onSend(); }}>
        <Stack spacing={2}>
          <TextField label="To" required {...text('to')} />
          <TextField label="Subject" required {...text('subject')} />
          <TextField label="Text" required multiline minRows={12} {...text('messagetext')} />
        </Stack>
        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <Button type="submit" variant="contained" disabled={busy}>Send message</Button>
          <Button href={`/member/${memberId}`}>Cancel</Button>
        </Stack>
      </Box>
    </Box>
  );
};
