import React from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

/**
 * What can be sent: for a membership a welcome or a confirmation of
 * payment, for a member a reminder, which can also be marked done or needed.
 *
 * @param {{ kind: 'membership'|'member', onSend: (type) => void, onMarkReminded?: (reminded) => void,
 *           busy?: boolean, error?: string, notice?: string }} props
 */
export const MessageActions = ({ kind, onSend, onMarkReminded, busy = false, error, notice }) => (
  <>
    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', mb: 1.5 }}>
      <Typography variant="body2" sx={{ fontWeight: 700 }}>Send:</Typography>
      {kind === 'membership' ? (
        <>
          <Button size="small" variant="outlined" disabled={busy} onClick={() => onSend('welcome')}>Welcome message</Button>
          <Button size="small" variant="outlined" disabled={busy} onClick={() => onSend('confirmation')}>Confirmation of payment</Button>
        </>
      ) : (
        <>
          <Button size="small" variant="outlined" disabled={busy} onClick={() => onSend('reminder')}>Reminder</Button>
          <Button size="small" disabled={busy} onClick={() => onMarkReminded(true)}>Mark as reminded</Button>
          <Button size="small" disabled={busy} onClick={() => onMarkReminded(false)}>Mark as reminder needed</Button>
        </>
      )}
    </Stack>
    {error && <Alert severity="warning" sx={{ mb: 1.5 }}>{error}</Alert>}
    {notice && <Alert severity="success" sx={{ mb: 1.5 }}>{notice}</Alert>}
  </>
);
