import React, { useId, useState } from 'react';
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
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { TEMPLATE_TYPES, MEMBERSHIP_TYPES, MEMBER_TYPES } from '/imports/common/lib/messageTemplates';
import { TemplateDocumentation } from './TemplateDocumentation';

const Choice = ({ label, options, value, onChange }) => {
  const id = useId();
  return (
    <FormControl>
      <FormLabel id={id}>{label}</FormLabel>
      <RadioGroup row aria-labelledby={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((option) => (
          <FormControlLabel key={option.value} value={option.value} control={<Radio size="small" />} label={option.label} />
        ))}
      </RadioGroup>
    </FormControl>
  );
};

/**
 * Add or edit a message template.
 *
 * @param {{ isNew: boolean, values: object, onChange: (field, value) => void, onSave: () => void,
 *           onTest: () => void, testResult?: { hasError: boolean, message: string },
 *           onDelete?: () => void, busy?: boolean, error?: string, children?: any }} props
 *   `children` goes below the form (the container puts the comments there).
 */
export const MessageTemplateForm = ({
  isNew, values, onChange, onSave, onTest, testResult, onDelete, busy = false, error, children,
}) => {
  const [confirming, setConfirming] = useState(false);
  const text = (name) => ({ value: values[name], onChange: (e) => onChange(name, e.target.value) });
  const flag = (name) => ({ checked: values[name], onChange: (e) => onChange(name, e.target.checked) });
  return (
    <Box sx={{ maxWidth: 900 }}>
      <Link href="/templates" underline="hover" variant="body2">← Message templates</Link>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mt: 0.5, mb: 3 }}>
        <Typography variant="h4" component="h1">{isNew ? 'Add template' : 'Message template'}</Typography>
        {!isNew && <Button color="error" variant="outlined" onClick={() => setConfirming(true)}>Delete</Button>}
      </Stack>
      {error && <Alert severity="error" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>{error}</Alert>}
      <Box component="form" onSubmit={(e) => { e.preventDefault(); onSave(); }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
          <TextField label="Template name" required fullWidth {...text('name')} />
          <TextField
            label="Message type" required select sx={{ minWidth: 260 }}
            slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}
            {...text('type')}
          >
            <option value="">(Select a type)</option>
            {TEMPLATE_TYPES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
          </TextField>
        </Stack>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={4} sx={{ mb: 2 }}>
          <Choice label="Membership type" options={MEMBERSHIP_TYPES} value={values.membershiptype} onChange={(v) => onChange('membershiptype', v)} />
          <Choice label="Member type" options={MEMBER_TYPES} value={values.membertype} onChange={(v) => onChange('membertype', v)} />
        </Stack>
        <Stack spacing={2} sx={{ mb: 1 }}>
          <TextField label="Subject" required fullWidth {...text('subject')} />
          <TextField
            label="Text" required multiline minRows={10} fullWidth
            slotProps={{ htmlInput: { style: { fontFamily: 'monospace' } } }}
            {...text('messagetext')}
          />
        </Stack>
        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
          <FormControlLabel control={<Checkbox {...flag('auto')} />} label="Automatic" />
          {!isNew && <FormControlLabel control={<Checkbox {...flag('deprecated')} />} label="Deprecated" />}
        </Stack>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Button type="submit" variant="contained" disabled={busy}>Save</Button>
          <Button onClick={onTest}>Test templates</Button>
          <Button href="/templates">Cancel</Button>
        </Stack>
        <Typography variant="caption" color="text.secondary">
          Test templates renders the subject and text with sample data. A template is saved only if both compile.
        </Typography>
      </Box>
      {testResult && (
        <Alert severity={testResult.hasError ? 'error' : 'success'} sx={{ mt: 2, whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: 13 }}>
          {testResult.message}
        </Alert>
      )}
      {children}
      <TemplateDocumentation />
      <Dialog open={confirming} onClose={() => setConfirming(false)}>
        <DialogTitle>Delete this template?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            “{values.name}” is removed for good. Messages of its type then use the best remaining template.
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
