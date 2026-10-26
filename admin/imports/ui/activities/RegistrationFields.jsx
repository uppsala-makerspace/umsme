import React from 'react';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { checkInSettings, DEFAULT_CHECK_IN } from '/imports/common/lib/activityRules';
import { native } from './SharedFields';

const REGISTRATIONS = [['none', 'No registration'], ['optional', 'Registration possible'], ['required', 'Registration required']];
const CHECK_INS = [['none', 'No'], ['default', 'Yes (default)'], ['custom', 'Yes (custom)']];

/**
 * How one signs up: whether, how many, how few make it happen, a queue,
 * information asked for, a certificate required, and check-in. On an event
 * of an activity (`inherited`) empty is as the activity, as in SharedFields.
 *
 * @param {{ values: object, onChange: (field, value) => void, inherited?: object|null, event?: boolean,
 *           certificates: Array<{ _id, name }> }} props
 */
export const RegistrationFields = ({ values, onChange, inherited = null, event = false, certificates }) => {
  const yesNo = (value) => (value ? 'yes' : 'no');
  const label = (list, value) => list.find(([v]) => v === value)?.[1] || value;
  const asActivity = (text) => `(As the activity: ${text})`;
  const text = (name, { inputMode } = {}) => {
    const placeholder = inherited?.[name] !== undefined && inherited?.[name] !== null && inherited?.[name] !== '' ? String(inherited[name]) : undefined;
    return {
      value: values[name],
      onChange: (e) => onChange(name, e.target.value),
      placeholder,
      slotProps: { ...(inputMode ? { htmlInput: { inputMode } } : {}), ...(placeholder ? { inputLabel: { shrink: true } } : {}) },
    };
  };
  const flag = (name, title) => (event ? (
    <TextField label={title} select fullWidth slotProps={native} value={values[name]} onChange={(e) => onChange(name, e.target.value)}>
      <option value="">{inherited ? asActivity(yesNo(inherited[name])) : '(No)'}</option>
      <option value="yes">Yes</option>
      <option value="no">No</option>
    </TextField>
  ) : (
    <FormControlLabel label={title} control={<Checkbox checked={!!values[name]} onChange={(e) => onChange(name, e.target.checked)} />} />
  ));
  const registration = values.registration || (inherited ? inherited.registration : '') || 'none';
  const takes = registration !== 'none';
  // Whether it asks for information, its own or as the activity: then the field's help text.
  const asksInfo = values.infoRequired === true || values.infoRequired === 'yes'
    || (values.infoRequired === '' && !!inherited?.infoRequired);
  // The check-in in force, and the window shown: the default's or an
  // inherited one greyed, a custom one of the form's own to edit.
  const ownCheckIn = values.checkIn || (inherited ? '' : 'none');
  const checkIn = ownCheckIn || inherited?.checkIn || 'none';
  const editable = ownCheckIn === 'custom';
  const shown = editable ? null : checkInSettings(ownCheckIn ? { checkIn: ownCheckIn } : inherited);
  // A custom window starts from the default's times, to change what differs.
  const chooseCheckIn = (value) => {
    onChange('checkIn', value);
    if (value !== 'custom') return;
    for (const [name, setting] of [['checkInOpensDaysBefore', 'opensDaysBefore'], ['checkInOpensAt', 'opensAt'],
      ['checkInClosesDaysBefore', 'closesDaysBefore'], ['checkInClosesAt', 'closesAt']]) {
      if (values[name] === '' || values[name] === undefined) onChange(name, String(DEFAULT_CHECK_IN[setting]));
    }
  };
  const windowField = (name, setting, title, inputMode) => (editable
    ? <TextField label={title} fullWidth {...text(name, { inputMode })} />
    : <TextField label={title} fullWidth disabled value={String(shown[setting])} />);
  const certificateName = (id) => certificates.find((c) => c._id === id)?.name?.sv || id;

  return (
    <>
      <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 600, mt: 1, mb: 1 }}>Registration</Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField label="Registration" select fullWidth slotProps={native} value={values.registration}
          onChange={(e) => onChange('registration', e.target.value)}>
          {event && <option value="">{inherited ? asActivity(label(REGISTRATIONS, inherited.registration || 'none')) : '(No registration)'}</option>}
          {REGISTRATIONS.map(([value, title]) => <option key={value} value={value}>{title}</option>)}
        </TextField>
        <TextField label="Seats" fullWidth helperText="Empty: no limit" {...text('maxSeats', { inputMode: 'numeric' })} />
        <TextField label="Fewest participants" fullWidth helperText="Until then the event awaits more" {...text('minSeats', { inputMode: 'numeric' })} />
      </Stack>
      {takes && (
        <>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
            {flag('queueAllowed', 'Queue when full')}
            {flag('infoRequired', 'Asks for information')}
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
            {asksInfo && (
              <TextField label="Help text in the information field" fullWidth helperText="Shown in the field when signing up, e.g. “Allergies”"
                {...text('infoPlaceholder')} />
            )}
            <TextField label="Required certificate" select fullWidth slotProps={native} value={values.requiredCertificateId}
              onChange={(e) => onChange('requiredCertificateId', e.target.value)}
              helperText="Only those who hold it may sign up">
              <option value="">{inherited?.requiredCertificateId ? asActivity(certificateName(inherited.requiredCertificateId)) : '(None)'}</option>
              {certificates.map((c) => <option key={c._id} value={c._id}>{c.name?.sv || c._id}</option>)}
            </TextField>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
            <TextField label="Check-in beforehand" select fullWidth slotProps={native} value={values.checkIn}
              onChange={(e) => chooseCheckIn(e.target.value)}
              helperText="Those with a seat confirm they come; whoever has not by the time it closes loses the seat to the queue.">
              {event && <option value="">{inherited ? asActivity(label(CHECK_INS, inherited.checkIn || 'none')) : '(No)'}</option>}
              {CHECK_INS.map(([value, title]) => <option key={value} value={value}>{title}</option>)}
            </TextField>
          </Stack>
          {checkIn !== 'none' && (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
              {windowField('checkInOpensDaysBefore', 'opensDaysBefore', 'Opens, days before', 'numeric')}
              {windowField('checkInOpensAt', 'opensAt', 'Opens at', 'numeric')}
              {windowField('checkInClosesDaysBefore', 'closesDaysBefore', 'Closes, days before', 'numeric')}
              {windowField('checkInClosesAt', 'closesAt', 'Closes at', 'numeric')}
            </Stack>
          )}
        </>
      )}
    </>
  );
};
