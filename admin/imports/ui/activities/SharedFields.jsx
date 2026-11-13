import React from 'react';
import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { FormCard } from './FormCard';
import { ClockField } from '../components/ClockField';
import { usualMinutes } from '/imports/common/lib/activityValues';

export const native = { select: { native: true }, inputLabel: { shrink: true } };

const yesNo = (value) => (value ? 'yes' : 'no');

/**
 * A yes/no field. On an activity a checkbox; on an event a choice of yes and
 * no, and, on an event of an activity (`inherited`), "as the activity" too.
 */
export const FlagField = ({ name, label, values, onChange, inherited = null, event = false }) => (event ? (
  <TextField label={label} select fullWidth slotProps={native} value={values[name] || (inherited ? '' : 'no')} onChange={(e) => onChange(name, e.target.value)}>
    {inherited && <option value="">{`(As the activity: ${yesNo(inherited[name])})`}</option>}
    <option value="yes">Yes</option>
    <option value="no">No</option>
  </TextField>
) : (
  <FormControlLabel label={label} control={<Checkbox checked={!!values[name]} onChange={(e) => onChange(name, e.target.checked)} />} />
));

/**
 * The fields an activity and an event share. On an event of an activity
 * (`inherited` is the activity) an empty field is the activity's: its value
 * shows greyed in the field, and a choice offers "as the activity". On an
 * activity, and a free-standing event, they are the thing's own.
 *
 * @param {{ values: object, onChange: (field, value) => void, inherited?: object|null, event?: boolean,
 *           categories: Array<{ _id, name }>, workshopOptions: Array<{ value, label }>,
 *           spaceOptions: Array<{ value, label }>, certificates?: Array<{ _id, name }>,
 *           groupWorkshops?: Object<string, string>, afterDescription?: React.ReactNode }} props
 *   `event` makes the yes/no fields three-way (yes, no, as the activity) rather than checkboxes.
 *   `afterDescription` is drawn between the first card and the rest (an activity's Visibility).
 *   `groupWorkshops` (group id → workshop id) names the workshop an empty
 *   workshop field stands for: the group's (groupWorkshopIds).
 */
export const SharedFields = ({ values, onChange, inherited = null, event = false, categories, workshopOptions, spaceOptions, certificates = [], groupWorkshops = {}, afterDescription = null }) => {
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
  // The workshop left empty: the activity's (its own, or its group's), or on
  // an activity or a free-standing event the group's.
  const noWorkshop = () => {
    if (inherited) {
      const id = inherited.workshopId || groupWorkshops[inherited.groupId];
      return id ? `(As the activity: ${labelOf(workshopOptions, id)})` : '(None)';
    }
    const id = groupWorkshops[values.groupId];
    return id ? `(From the group: ${labelOf(workshopOptions, id)})` : '(None)';
  };
  const categoryOptions = categories.map((c) => ({ value: c._id, label: c.name?.sv || c._id }));
  const flag = (name, label) => <FlagField name={name} label={label} values={values} onChange={onChange} inherited={inherited} event={event} />;

  const kind = event ? 'event' : 'activity';
  const usual = event ? null : usualMinutes(values.startsAt, values.endsAt);
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
          {/* An activity's usual times, without a day: each new event of it starts from them. */}
          {!event && <ClockField label="Usually starts" fullWidth helperText="A new event gets it" value={values.startsAt} onChange={(v) => onChange('startsAt', v)} />}
          {!event && <ClockField label="Usually ends" fullWidth helperText="A new event gets it" value={values.endsAt} onChange={(v) => onChange('endsAt', v)} />}
          {usual !== null
            ? <TextField label="Duration (minutes)" fullWidth disabled value={String(usual)} helperText="From its usual times" />
            : <TextField label="Duration (minutes)" fullWidth {...text('durationMinutes', { inputMode: 'numeric' })} />}
          <TextField label="Cost (kr)" fullWidth {...text('cost', { inputMode: 'decimal' })} />
        </Stack>
      </FormCard>
      {afterDescription}
      <FormCard title="Where and contact" kind={kind}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
          <TextField label="Shown at workshop" select fullWidth slotProps={native} value={values.workshopId} onChange={(e) => onChange('workshopId', e.target.value)}
            helperText="A workshop or an area of interest. Left empty, the group's: that of the steering group the group is or is under.">
            <option value="">{noWorkshop()}</option>
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
        <TextField label="Certificate it gives" select fullWidth slotProps={native} sx={{ mb: 2 }} value={values.targetCertificateId}
          onChange={(e) => onChange('targetCertificateId', e.target.value)}
          helperText="What those who take part may come away with: a host who may certify it gives it to those who came, or one asks for it.">
          <option value="">{none('targetCertificateId', certificateOptions, '(None)')}</option>
          {certificateOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </TextField>
      </FormCard>
    </>
  );
};
