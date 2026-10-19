import React, { useState } from 'react';
import { marked } from 'marked';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Section } from '../components/Section';
import { TemplateDocumentation } from '../messageTemplates/TemplateDocumentation';
import { TYPES, moment } from './labels';

const native = { select: { native: true }, inputLabel: { shrink: true } };

/** The text as members will read it: markdown, line breaks kept. */
const Preview = ({ language, subject, body }) => (
  <Paper variant="outlined" sx={{ p: 2, flex: 1, minWidth: 0 }}>
    <Typography variant="overline" color="text.secondary">{language}</Typography>
    <Typography variant="h6" component="p" sx={{ mb: 1 }}>{subject || '—'}</Typography>
    {/* The text is written by admin and board, as it was on the Blaze page. */}
    <Box sx={{ '& h1': { fontSize: '1.6rem' }, '& h2': { fontSize: '1.3rem' } }}
      dangerouslySetInnerHTML={{ __html: body ? marked.parse(body, { breaks: true }) : '' }} />
  </Paper>
);

/**
 * Write a new announcement, or show and edit one: the type, subjects and
 * texts in Swedish and English, saved with Save, and the text as it will
 * read. A saved draft goes on to the mail page to be sent.
 *
 * @param {{ isNew: boolean, announcement?: object, values: object, onChange: (field, value) => void,
 *           onSave: () => void, dirty?: boolean, busy?: boolean, error?: string, notice?: string,
 *           onDelete?: () => void }} props
 *   `dirty` says the form has changes not yet saved; it may not be sent then.
 */
export const AnnouncementForm = ({ isNew, announcement, values, onChange, onSave, dirty = false, busy = false, error, notice, onDelete }) => {
  const [confirming, setConfirming] = useState(false);
  const text = (name) => ({ value: values[name], onChange: (e) => onChange(name, e.target.value) });
  const sent = announcement?.status === 'sent';
  return (
    <Box sx={{ maxWidth: 1100 }}>
      <Link href="/announcements" underline="hover" variant="body2">← Announcements</Link>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mt: 0.5, mb: 1 }}>
        <Typography variant="h4" component="h1">
          {isNew ? 'New announcement' : announcement.subjectSv}
          {!isNew && <Chip size="small" sx={{ ml: 1, verticalAlign: 'middle' }} color={sent ? 'success' : 'default'} label={sent ? 'Sent' : 'Draft'} />}
        </Typography>
        {!isNew && (
          <Stack direction="row" spacing={1}>
            {!sent && (
              <Button variant="contained" color="success" href={`/mail/send?announcement=${announcement._id}`} disabled={dirty}>Send</Button>
            )}
            <Button color="error" variant="outlined" onClick={() => setConfirming(true)}>Delete</Button>
          </Stack>
        )}
      </Stack>
      {!isNew && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Created {moment(announcement.createdAt)}
          {announcement.sentAt && <> · sent {moment(announcement.sentAt)}</>}
          {announcement.mailId && <> · <Link href={`/mail/${announcement.mailId}`}>View sent mail →</Link></>}
          {!sent && dirty && ' · save before sending'}
        </Typography>
      )}
      {sent && <Alert severity="warning" sx={{ mb: 2 }}>This announcement has already been sent. Changes do not reach the emails already delivered.</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 2 }}>{notice}</Alert>}

      <Box component="form" onSubmit={(e) => { e.preventDefault(); onSave(); }}>
        <TextField label="Type" select sx={{ minWidth: 220, mb: 2 }} slotProps={native} {...text('type')}>
          {TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </TextField>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
          <Stack spacing={2} sx={{ flex: 1 }}>
            <TextField label="Ämne (Svenska)" required fullWidth {...text('subjectSv')} />
            <TextField label="Innehåll (Svenska)" required multiline minRows={12} fullWidth helperText="Markdown" {...text('bodySv')} />
          </Stack>
          <Stack spacing={2} sx={{ flex: 1 }}>
            <TextField label="Subject (English)" fullWidth {...text('subjectEn')} />
            <TextField label="Content (English)" multiline minRows={12} fullWidth helperText="Markdown" {...text('bodyEn')} />
          </Stack>
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button type="submit" variant="contained" disabled={busy}>Save</Button>
          <Button href="/announcements">{isNew ? 'Cancel' : 'Back'}</Button>
        </Stack>
      </Box>

      <Section title="As it will read">
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <Preview language="Svenska" subject={values.subjectSv} body={values.bodySv} />
          <Preview language="English" subject={values.subjectEn} body={values.bodyEn} />
        </Stack>
      </Section>

      <TemplateDocumentation />

      <Dialog open={confirming} onClose={() => setConfirming(false)}>
        <DialogTitle>Delete this announcement?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {announcement?.mailId
              ? 'The record of its mail is deleted too; emails already sent stay sent.'
              : 'The draft is deleted for good.'}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirming(false)}>Cancel</Button>
          <Button color="error" variant="contained" disabled={busy} onClick={() => { setConfirming(false); onDelete(); }}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
