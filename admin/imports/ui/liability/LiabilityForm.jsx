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
import { DateField } from '../components/DateField';
import { FORM_WIDTH } from '../components/PageTabs';

/**
 * Add or edit a version of the liability agreement.
 *
 * @param {{ isNew: boolean, values: { title, date, sv, en }, onChange: (field, value) => void,
 *           onSave: () => void, onDelete?: () => void, busy?: boolean, error?: string }} props
 */
export const LiabilityForm = ({ isNew, values, onChange, onSave, onDelete, busy = false, error }) => {
  const [confirming, setConfirming] = useState(false);
  const field = (name) => ({ value: values[name], onChange: (e) => onChange(name, e.target.value) });
  const text = { multiline: true, minRows: 8, fullWidth: true, helperText: 'Markdown', slotProps: { htmlInput: { style: { fontFamily: 'monospace' } } } };
  return (
    <Box sx={{ maxWidth: FORM_WIDTH }}>
      <Link href="/liability" underline="hover" variant="body2">← Liability documents</Link>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mt: 0.5, mb: 3 }}>
        <Typography variant="h4" component="h1">{isNew ? 'Add liability document' : 'Liability document'}</Typography>
        {!isNew && <Button color="error" variant="outlined" onClick={() => setConfirming(true)}>Delete</Button>}
      </Stack>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Box component="form" onSubmit={(e) => { e.preventDefault(); onSave(); }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
          <TextField label="Title" required fullWidth {...field('title')} />
          <DateField label="Date" required sx={{ minWidth: 200 }} value={values.date || ''} onChange={(v) => onChange('date', v)} />
        </Stack>
        <Stack spacing={2} sx={{ mb: 2 }}>
          <TextField label="Document text (Swedish)" {...text} {...field('sv')} />
          <TextField label="Document text (English)" {...text} {...field('en')} />
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button type="submit" variant="contained" disabled={busy}>Save</Button>
          <Button href="/liability">Cancel</Button>
        </Stack>
      </Box>
      <Dialog open={confirming} onClose={() => setConfirming(false)}>
        <DialogTitle>Delete this version?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            “{values.title}” is removed for good. If it is the newest version, members are asked to approve the one before it.
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
