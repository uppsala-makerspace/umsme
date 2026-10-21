import React, { useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import { overdueReminderDays, reminderDays } from '/imports/common/lib/rules';
import { useServerList } from '../components/useServerList';
import { MemberList } from './MemberList';
import { memberPage, runReminderJob } from './data';

export const RemindersPage = () => {
  const list = useServerList(memberPage('reminders'), { sort: { field: 'member', direction: 'asc' } });
  const [confirming, setConfirming] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const run = async () => {
    setConfirming(false);
    setRunning(true);
    try {
      setResult({ severity: 'success', text: await runReminderJob() });
      list.refresh();
    } catch (e) {
      setResult({ severity: 'error', text: e.reason || e.message });
    } finally {
      setRunning(false);
    }
  };
  return (
    <>
      <MemberList
        title="Reminders"
        note={`Members whose membership or lab ends within ${reminderDays} days, or ended in the last ${overdueReminderDays}. Family members are reminded through their payer.`}
        actions={<Button variant="outlined" disabled={running} onClick={() => setConfirming(true)}>Run reminder job now</Button>}
        empty="Nobody is due a reminder."
        {...list}
      >
        {result && <Alert severity={result.severity} sx={{ mb: 2 }}>{String(result.text)}</Alert>}
      </MemberList>
      <Dialog open={confirming} onClose={() => setConfirming(false)}>
        <DialogTitle>Run the reminder job now?</DialogTitle>
        <DialogContent>
          <DialogContentText>Mails go to everyone in the window who has not already had this reminder.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirming(false)}>Cancel</Button>
          <Button variant="contained" onClick={run}>Run now</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
