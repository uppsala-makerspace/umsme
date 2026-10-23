import React, { useEffect, useRef, useState } from 'react';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import { createSvgIcon } from '@mui/material/utils';
import { parseDay } from '../dates';

const CalendarIcon = createSvgIcon(<path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2m0 16H5V9h14zM5 7V6h14v1z" />, 'Calendar');

/**
 * A day, written YYYY-MM-DD whatever the browser's language (its own date
 * field follows that, and shows MM/DD/YYYY in English), with a button for
 * the browser's calendar. YYYYMMDD is taken too. Only a whole day, or
 * nothing, reaches `onChange`; anything else stays in the field, marked.
 *
 * @param {{ label: string, value: string, onChange: (day: string) => void, helperText?: React.ReactNode }} props
 *   `value` and what `onChange` gets are 'YYYY-MM-DD', or '' for none.
 *   Other props go to the TextField.
 */
export const DateField = ({ label, value, onChange, helperText, slotProps, ...props }) => {
  const [text, setText] = useState(value || '');
  const picker = useRef(null);
  // Follow the value when it changes from outside (a form loaded, a reset).
  useEffect(() => { if (parseDay(text) !== (value || '')) setText(value || ''); }, [value]);
  const wrong = parseDay(text) === null;
  const take = (next) => {
    setText(next);
    const parsed = parseDay(next);
    if (parsed !== null && parsed !== (value || '')) onChange(parsed);
  };
  return (
    <TextField
      {...props}
      label={label} value={text} placeholder="YYYY-MM-DD"
      onChange={(e) => take(e.target.value)}
      onBlur={() => { const parsed = parseDay(text); if (parsed) setText(parsed); }}
      error={wrong || props.error}
      helperText={wrong ? 'Write the day as YYYY-MM-DD' : helperText}
      slotProps={{
        ...slotProps,
        inputLabel: { shrink: true, ...slotProps?.inputLabel },
        htmlInput: { inputMode: 'numeric', maxLength: 10, ...slotProps?.htmlInput },
        input: {
          endAdornment: (
            <InputAdornment position="end">
              <IconButton size="small" edge="end" aria-label="Open calendar" disabled={props.disabled}
                onClick={() => { try { picker.current.showPicker(); } catch (e) { picker.current.focus(); } }}>
                <CalendarIcon fontSize="small" />
              </IconButton>
              <input ref={picker} type="date" tabIndex={-1} aria-hidden value={parseDay(text) || ''}
                onChange={(e) => take(e.target.value)}
                style={{ position: 'absolute', right: 0, bottom: 0, width: 1, height: 1, opacity: 0, border: 0, padding: 0 }} />
            </InputAdornment>
          ),
          ...slotProps?.input,
        },
      }}
    />
  );
};
