import React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { DateField } from '../components/DateField';

const native = { select: { native: true }, inputLabel: { shrink: true } };

/** The form's values for a member, or empty ones for a new member. */
export const memberValues = (member) => ({
  name: member?.name || '', birthyear: member?.birthyear ?? '', gender: member?.gender || '', rfid: member?.rfid || '',
  bankName: member?.bankName || '', bankClearing: member?.bankClearing || '', bankAccountNumber: member?.bankAccountNumber || '',
  bankAccountHolder: member?.bankAccountHolder || '', email: member?.email || '', lock: member?.lock || '',
  youth: !!member?.youth, liability: !!member?.liability,
  liabilityDate: member?.liabilityDate ? new Date(member.liabilityDate).toLocaleDateString('sv-SE') : '',
  mobile: member?.mobile || '',
});

/** The values as the methods want them: numbers, dates, nulls for the empty ones. */
export const memberFields = (v) => ({
  ...v,
  birthyear: v.birthyear === '' ? null : Number(v.birthyear),
  liabilityDate: v.liabilityDate ? new Date(`${v.liabilityDate}T00:00:00`) : null,
});

/**
 * A member's details: what admin keeps about them, saved with Save. The
 * member number, the family flag and a payment error are shown, not edited.
 *
 * @param {{ values: object, onChange: (field, value) => void, onSave: () => void, member?: object,
 *           busy?: boolean, submitLabel?: string }} props
 */
export const MemberForm = ({ values, onChange, onSave, member, busy = false, submitLabel = 'Save' }) => {
  const text = (name) => ({ value: values[name] ?? '', onChange: (e) => onChange(name, e.target.value) });
  const check = (name, label) => <FormControlLabel label={label} control={<Checkbox checked={!!values[name]} onChange={(e) => onChange(name, e.target.checked)} />} />;
  return (
    <Box component="form" onSubmit={(e) => { e.preventDefault(); onSave(); }}>
      <Stack spacing={2}>
        {member && <TextField label="Id" value={member.mid || ''} slotProps={{ input: { readOnly: true } }} />}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField label="Name" required fullWidth {...text('name')} />
          <TextField label="Email" type="email" fullWidth {...text('email')} />
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField label="Mobile" fullWidth {...text('mobile')} />
          <TextField label="Year of birth" type="number" sx={{ minWidth: 160 }} {...text('birthyear')} />
          <TextField label="Gender" select slotProps={native} sx={{ minWidth: 180 }} {...text('gender')}>
            <option value="">(Select one)</option><option value="male">male</option><option value="female">female</option><option value="undisclosed">undisclosed</option>
          </TextField>
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField label="RFID" fullWidth {...text('rfid')} />
          <TextField label="Lock" fullWidth helperText="The member's username on the door lock" {...text('lock')} />
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField label="Bank" fullWidth {...text('bankName')} />
          <TextField label="Clearing number" fullWidth {...text('bankClearing')} />
          <TextField label="Account number" fullWidth {...text('bankAccountNumber')} />
        </Stack>
        <TextField label="Account holder" fullWidth {...text('bankAccountHolder')} />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
          {check('youth', 'Youth')}
          {check('liability', 'Liability')}
          <DateField label="Liability version approved" value={values.liabilityDate ?? ''} onChange={(v) => onChange('liabilityDate', v)} />
          {member && <FormControlLabel label="Family" control={<Checkbox checked={!!member.family} disabled />} />}
        </Stack>
        {member?.paymentError && <TextField label="Payment Error" value={member.paymentError} slotProps={{ input: { readOnly: true } }} />}
      </Stack>
      <Button type="submit" variant="contained" sx={{ mt: 2 }} disabled={busy}>{submitLabel}</Button>
    </Box>
  );
};
