import React, { useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { DateField } from '../components/DateField';

/**
 * Ask for what an action needs before it runs: a reason, a date, a yes or
 * no. In place of the browser's prompt() and confirm().
 *
 * @param {{ ask: null|{ title: string, text?: string, confirm: string, fields: Array<{ name, label,
 *           type?: 'text'|'date'|'checkbox', required?: boolean }>, onAnswer: (values) => void },
 *           onClose: () => void }} props
 */
export const AskDialog = ({ ask, onClose }) => {
  const [values, setValues] = useState({});
  useEffect(() => { setValues({}); }, [ask]);
  if (!ask) return null;
  const missing = ask.fields.some((f) => f.required && !String(values[f.name] ?? '').trim());
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{ask.title}</DialogTitle>
      <DialogContent>
        {ask.text && <DialogContentText sx={{ mb: 2 }}>{ask.text}</DialogContentText>}
        <Stack spacing={2} sx={{ pt: 1 }}>
          {ask.fields.map((f) => {
            if (f.type === 'checkbox') {
              return (
                <FormControlLabel key={f.name} label={f.label}
                  control={<Checkbox checked={!!values[f.name]} onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.checked }))} />} />
              );
            }
            if (f.type === 'date') {
              return (
                <DateField key={f.name} label={f.label} required={f.required} autoFocus={f === ask.fields[0]}
                  value={values[f.name] || ''} onChange={(day) => setValues((v) => ({ ...v, [f.name]: day }))} />
              );
            }
            return (
              <TextField key={f.name} label={f.label} required={f.required} autoFocus={f === ask.fields[0]} multiline
                value={values[f.name] || ''} onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))} />
            );
          })}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={missing} onClick={() => { onClose(); ask.onAnswer(values); }}>{ask.confirm}</Button>
      </DialogActions>
    </Dialog>
  );
};
