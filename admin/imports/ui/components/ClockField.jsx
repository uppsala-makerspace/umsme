import React from 'react';
import TextField from '@mui/material/TextField';
import { parseClock } from '/imports/common/lib/days';

/**
 * A time of day, written HH:MM as everywhere in admin (18, 1800 and 18.00 are
 * taken and become 18:00 on leaving the field). Anything else is marked, and
 * the server refuses it.
 *
 * @param {{ label: string, value: string, onChange: (text: string) => void, helperText?: React.ReactNode }} props
 *   Other props go to the TextField.
 */
export const ClockField = ({ label, value, onChange, helperText, slotProps, ...props }) => {
  const wrong = parseClock(value) === null;
  return (
    <TextField
      label={label} value={value} placeholder="18:00"
      onChange={(e) => onChange(e.target.value)}
      onBlur={() => { const parsed = parseClock(value); if (parsed && parsed !== value) onChange(parsed); }}
      error={wrong} helperText={wrong ? 'A time, like 18:00' : helperText}
      {...props}
      slotProps={{ ...slotProps, htmlInput: { inputMode: 'numeric', maxLength: 5, ...slotProps?.htmlInput }, inputLabel: { shrink: true, ...slotProps?.inputLabel } }}
    />
  );
};
