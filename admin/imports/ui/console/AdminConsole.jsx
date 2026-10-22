import React, { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';
import { Section } from '../components/Section';

/**
 * A console action: a button that asks first, then shows what came of it.
 *
 * @param {{ label: string, question: string, confirmLabel: string, busy?: boolean, disabled?: boolean,
 *           onRun: () => void, result?: { severity, text }|null }} props
 */
const Action = ({ label, question, confirmLabel, busy, disabled, onRun, result }) => {
  const [asking, setAsking] = useState(false);
  return (
    <>
      <Button variant="contained" disabled={busy || disabled} onClick={() => setAsking(true)}>{label}</Button>
      {result && (
        <Alert role="status" severity={result.severity} sx={{ mt: 1.5 }}>
          <Box component="pre" sx={{ m: 0, p: 0, border: 0, background: 'none', whiteSpace: 'pre-wrap', fontFamily: 'inherit', maxHeight: 300, overflowY: 'auto' }}>{result.text}</Box>
        </Alert>
      )}
      <Dialog open={asking} onClose={() => setAsking(false)}>
        <DialogTitle>{label}?</DialogTitle>
        <DialogContent><DialogContentText>{question}</DialogContentText></DialogContent>
        <DialogActions>
          <Button onClick={() => setAsking(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => { setAsking(false); onRun(); }}>{confirmLabel}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

/**
 * The admin console: the lock sync, merging members, the mandatory
 * certificate for everyone, and two tools for putting old data right.
 *
 * @param {{ busy?: string|null, results: object, mandatory: { name, count }|null|undefined,
 *           on: { syncLock, grantMandatory, migrateUnlocks, updateDates }, merge: React.ReactNode }} props
 *   `busy` names the action running; `results` holds each action's outcome by name.
 */
export const AdminConsole = ({ busy = null, results = {}, mandatory, on, merge }) => (
  <Box sx={{ maxWidth: 1000 }}>
    <Typography variant="h4" component="h1">Admin console</Typography>

    <Section title="Force Danalock unlock sync" note="Runs the same sync as the cron job: pulls recent Danalock unlocks into doorunlocks and (if enabled in settings) sends the daily summary email.">
      <Action label="Sync now" question="The unlocks are fetched from Danalock now, as the nightly job does." confirmLabel="Sync" busy={!!busy} onRun={on.syncLock} result={results.syncLock} />
    </Section>

    {merge}

    <Section title="Grant mandatory certificate to all members" note={mandatory ? 'Creates attestations for all members in the database who don’t have one yet, with you as certifier.' : undefined}>
      {mandatory === undefined && <Typography variant="body2" color="text.secondary">Loading…</Typography>}
      {mandatory === null && <Typography variant="body2" color="text.secondary">No mandatory certificate has been configured.</Typography>}
      {mandatory && (
        <>
          <Typography sx={{ mb: 1 }}>Mandatory certificate: <strong>{mandatory.name}</strong>. {mandatory.count === 0 ? 'Every member has it.' : `${mandatory.count} members lack it.`}</Typography>
          <Action label="Grant to all members" question={`“${mandatory.name}” is granted to ${mandatory.count} members.`} confirmLabel={`Grant to ${mandatory.count}`}
            busy={!!busy} disabled={mandatory.count === 0} onRun={on.grantMandatory} result={results.grantMandatory} />
        </>
      )}
    </Section>

    <Section title="Update members with correct dates" note="Figures every member’s member and lab dates again from their memberships, as Update dates does on a member’s page.">
      <Action label="Update all members" question="Every member’s dates are figured again from their memberships." confirmLabel="Update" busy={!!busy} onRun={on.updateDates} result={results.updateDates} />
    </Section>

    <Section title="Migrate legacy unlocks to doorunlocks" note="Copies every row in the legacy unlocks collection into doorunlocks and then empties unlocks. Re-runnable: rows already in doorunlocks are skipped. Usernames that don’t match a member’s email are stored as extid instead of memberid.">
      <Action label="Migrate now" question="The legacy unlocks are copied into doorunlocks, and the legacy collection is emptied." confirmLabel="Migrate" busy={!!busy} onRun={on.migrateUnlocks} result={results.migrateUnlocks} />
    </Section>
  </Box>
);
