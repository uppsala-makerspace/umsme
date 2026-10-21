import React, { useState } from 'react';
import { marked } from 'marked';
import removeMd from 'remove-markdown';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormLabel from '@mui/material/FormLabel';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { Addresses } from './Addresses';
import { RECIPIENT_GROUPS } from './labels';

const FORMATS = [['raw', 'Raw'], ['markdown', 'Markdown'], ['plaintext', 'Plain text']];

/** The form's values for a new mail; from an announcement, its subject and text in both languages. */
export const mailValues = (announcement) => ({
  from: '', recipients: 'members', family: false, format: 'raw', removed: [],
  subject: announcement ? [announcement.subjectSv, announcement.subjectEn].filter(Boolean).join(' / ') : '',
  template: announcement ? [announcement.bodySv, announcement.bodyEn].filter(Boolean).join('\n---\n\n') : '',
});

/**
 * Writing and sending a group mail: from whom, to which members (any of
 * them taken away), the subject and the text, written raw, as markdown or
 * as markdown sent as plain text. The text is a template, rendered for each
 * recipient (see the documentation below it). Sending asks first.
 *
 * @param {{ values: object, onChange: (field, value) => void, senders: string[], recipients: object[]|null,
 *           onSend: () => void, sending?: boolean, error?: string, announcement?: object, documentation?: React.ReactNode }} props
 *   `recipients` as mails.recipients returns them, null while they load.
 */
export const SendMail = ({ values, onChange, senders, recipients, onSend, sending = false, error, announcement, documentation }) => {
  const [asking, setAsking] = useState(false);
  const removed = new Set(values.removed);
  const to = (recipients || []).map((r) => r.to).filter((a) => !removed.has(a));
  const missing = !values.from ? 'Choose who the mail is from.' : !values.subject.trim() ? 'Write a subject.' : !values.template.trim() ? 'Write the text.' : to.length === 0 ? 'There is nobody to send to.' : null;
  const preview = values.format === 'markdown'
    ? <Box className="markdown" dangerouslySetInnerHTML={{ __html: marked.parse(values.template, { breaks: true }) }} />
    : <Box sx={{ whiteSpace: 'pre-wrap' }}>{removeMd(values.template, { stripListLeaders: false })}</Box>;
  return (
    <Box sx={{ maxWidth: 1200 }}>
      <Typography variant="h4" component="h1" sx={{ mb: 2 }}>Send mail</Typography>
      {announcement && <Alert severity="info" sx={{ mb: 2 }}>Sending the announcement <strong>{announcement.subjectSv}</strong>; once sent it is marked sent and pushed to the members’ phones. <Link href={`/announcement/${announcement._id}`}>Back to the announcement</Link></Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {sending && <Alert severity="warning" sx={{ mb: 2 }}><strong>Sending {to.length} mails…</strong> Stay on the page until they are all sent.</Alert>}
      <Stack spacing={2}>
        <FormControl>
          <FormLabel id="mail-from">From</FormLabel>
          <RadioGroup row aria-labelledby="mail-from" value={values.from} onChange={(e) => onChange('from', e.target.value)}>
            {senders.map((s) => <FormControlLabel key={s} value={s} control={<Radio />} label={s} />)}
          </RadioGroup>
        </FormControl>
        <FormControl>
          <FormLabel id="mail-recipients">Recipients</FormLabel>
          <RadioGroup row aria-labelledby="mail-recipients" value={values.recipients} onChange={(e) => { onChange('recipients', e.target.value); onChange('removed', []); }}>
            {RECIPIENT_GROUPS.map(([value, label]) => <FormControlLabel key={value} value={value} control={<Radio />} label={label} />)}
          </RadioGroup>
          <FormControlLabel control={<Checkbox checked={values.family} onChange={(e) => { onChange('family', e.target.checked); onChange('removed', []); }} />} label="Include family members" />
        </FormControl>
        <Box>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
            <FormLabel>To ({recipients ? to.length : '…'})</FormLabel>
            {values.removed.length > 0 && <Button size="small" onClick={() => onChange('removed', [])}>Put back the {values.removed.length} taken away</Button>}
          </Stack>
          {recipients ? <Addresses addresses={to} onRemove={(a) => onChange('removed', [...values.removed, a])} empty="Nobody in this group." /> : <Typography variant="body2" color="text.secondary">Finding the recipients…</Typography>}
        </Box>
        <TextField label="Subject" value={values.subject} onChange={(e) => onChange('subject', e.target.value)} fullWidth />
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <FormLabel>Format</FormLabel>
          <ToggleButtonGroup size="small" exclusive value={values.format} onChange={(e, f) => f && onChange('format', f)}>
            {FORMATS.map(([value, label]) => <ToggleButton key={value} value={value}>{label}</ToggleButton>)}
          </ToggleButtonGroup>
        </Stack>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField label="Text" multiline minRows={20} value={values.template} onChange={(e) => onChange('template', e.target.value)} sx={{ flex: 1 }} />
          {values.format !== 'raw' && (
            <Box sx={{ flex: 1 }}>
              <FormLabel>Preview</FormLabel>
              <Paper variant="outlined" sx={{ p: 2, minHeight: 200, overflowY: 'auto' }}>{preview}</Paper>
            </Box>
          )}
        </Stack>
        {missing && !sending && <Typography variant="body2" color="text.secondary">{missing}</Typography>}
        <Box><Button variant="contained" disabled={sending || !!missing} onClick={() => setAsking(true)}>Send mail</Button></Box>
      </Stack>
      {documentation}

      <Dialog open={asking} onClose={() => setAsking(false)}>
        <DialogTitle>Send the mail?</DialogTitle>
        <DialogContent><DialogContentText>It goes to {to.length} recipients from {values.from}.</DialogContentText></DialogContent>
        <DialogActions>
          <Button onClick={() => setAsking(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => { setAsking(false); onSend(to); }}>Send to {to.length}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
