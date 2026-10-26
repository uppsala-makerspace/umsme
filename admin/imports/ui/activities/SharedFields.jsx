import React from 'react';
import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { FormCard } from './FormCard';

export const native = { select: { native: true }, inputLabel: { shrink: true } };

const yesNo = (value) => (value ? 'yes' : 'no');

/**
 * The fields an activity and an event share. On an event of an activity
 * (`inherited` is the activity) an empty field is the activity's: its value
 * shows greyed in the field, and a choice offers "as the activity". On an
 * activity, and a free-standing event, they are the thing's own.
 *
 * @param {{ values: object, onChange: (field, value) => void, inherited?: object|null, event?: boolean,
 *           categories: Array<{ _id, name }>, workshopOptions: Array<{ value, label }>,
 *           spaceOptions: Array<{ value, label }>, certificates?: Array<{ _id, name }> }} props
 *   `event` makes the yes/no fields three-way (yes, no, as the activity) rather than checkboxes.
 */
export const SharedFields = ({ values, onChange, inherited = null, event = false, categories, workshopOptions, spaceOptions, certificates = [] }) => {
  const from = (field, lang) => {
    const value = lang ? inherited?.[field]?.[lang] : inherited?.[field];
    return value === undefined || value === null || value === '' ? undefined : String(value);
  };
  const text = (name, { field = name, lang, inputMode } = {}) => {
    const placeholder = inherited ? from(field, lang) : undefined;
    return {
      value: values[name],
      onChange: (e) => onChange(name, e.target.value),
      placeholder,
      slotProps: {
        ...(inputMode ? { htmlInput: { inputMode } } : {}),
        ...(placeholder ? { inputLabel: { shrink: true } } : {}),
      },
    };
  };
  const labelOf = (options, id) => options.find((o) => o.value === id)?.label || id;
  const none = (field, options, empty) => (inherited?.[field]
    ? `(As the activity: ${labelOf(options, inherited[field])})`
    : empty);
  const categoryOptions = categories.map((c) => ({ value: c._id, label: c.name?.sv || c._id }));
  const flag = (name, label) => (event ? (
    <TextField label={label} select fullWidth slotProps={native} value={values[name]} onChange={(e) => onChange(name, e.target.value)}>
      <option value="">{inherited ? `(As the activity: ${yesNo(inherited[name])})` : '(No)'}</option>
      <option value="yes">Yes</option>
      <option value="no">No</option>
    </TextField>
  ) : (
    <FormControlLabel label={label} control={<Checkbox checked={!!values[name]} onChange={(e) => onChange(name, e.target.checked)} />} />
  ));

  const kind = event ? 'event' : 'activity';
  const certificateOptions = certificates.map((c) => ({ value: c._id, label: c.name?.sv || c._id }));

  return (
    <>
      <FormCard title="Name and description" kind={kind}>
        <Stack spacing={2} sx={{ mb: 2 }}>
          <TextField label="Name (Swedish)" required={!inherited} fullWidth {...text('nameSv', { field: 'name', lang: 'sv' })} />
          <TextField label="Name (English)" fullWidth {...text('nameEn', { field: 'name', lang: 'en' })} />
          <TextField label="Description (Swedish, markdown)" multiline minRows={4} fullWidth {...text('descriptionSv', { field: 'description', lang: 'sv' })} />
          <TextField label="Description (English, markdown)" multiline minRows={4} fullWidth {...text('descriptionEn', { field: 'description', lang: 'en' })} />
          <TextField label="Category" select fullWidth slotProps={native} value={values.categoryId} onChange={(e) => onChange('categoryId', e.target.value)}>
            <option value="">{none('categoryId', categoryOptions, '(No category)')}</option>
            {categoryOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </TextField>
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
          <TextField label="Duration (minutes)" fullWidth {...text('durationMinutes', { inputMode: 'numeric' })} />
          <TextField label="Cost (kr)" fullWidth {...text('cost', { inputMode: 'decimal' })} />
        </Stack>
      </FormCard>
      <FormCard title="Where and contact" kind={kind}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
          <TextField label="Shown at workshop" select fullWidth slotProps={native} value={values.workshopId} onChange={(e) => onChange('workshopId', e.target.value)}
            helperText="A workshop or an area of interest; none for something of the whole association.">
            <option value="">{none('workshopId', workshopOptions, '(None)')}</option>
            {workshopOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </TextField>
          <TextField label="Space" select fullWidth slotProps={native} value={values.spaceId} onChange={(e) => onChange('spaceId', e.target.value)}>
            <option value="">{none('spaceId', spaceOptions, '(No space)')}</option>
            {spaceOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </TextField>
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
          <TextField label="Slack channel" fullWidth {...text('slackChannel')} />
          <TextField label="Contact email" fullWidth {...text('contactEmail')} />
        </Stack>
      </FormCard>
      <FormCard title="Who can take part" kind={kind}>
        <Box sx={{ mb: 2 }}>{flag('membersOnly', 'For members only')}</Box>
        <TextField label="Required certificate" select fullWidth slotProps={native} sx={{ mb: 2 }} value={values.requiredCertificateId}
          onChange={(e) => onChange('requiredCertificateId', e.target.value)} helperText="Applies when signing up: only those who hold it may.">
          <option value="">{none('requiredCertificateId', certificateOptions, '(None)')}</option>
          {certificateOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </TextField>
        <Box sx={{ mb: 2 }}>{flag('published', 'Shown on the website')}</Box>
      </FormCard>
    </>
  );
};
