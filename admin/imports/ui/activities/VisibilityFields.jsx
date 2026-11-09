import React from 'react';
import Box from '@mui/material/Box';
import FormHelperText from '@mui/material/FormHelperText';
import { FormCard } from './FormCard';
import { FlagField } from './SharedFields';

/**
 * Visibility: what of an activity or event the website shows. Whether it is
 * on the website at all, and whether its hosts are named there, by first name
 * only. An event of an activity takes either from the activity unless it says
 * otherwise; an activity's choice for the hosts applies to its events, since
 * the hosts are chosen per event.
 *
 * @param {{ values: object, onChange: (field, value) => void, inherited?: object|null, event?: boolean }} props
 */
export const VisibilityFields = ({ values, onChange, inherited = null, event = false }) => {
  const flag = (name, label) => <FlagField name={name} label={label} values={values} onChange={onChange} inherited={inherited} event={event} />;
  return (
    <FormCard title="Visibility" kind={event ? 'event' : 'activity'}>
      <Box sx={{ mb: 2 }}>{flag('published', 'Shown on the website')}</Box>
      <Box sx={{ mb: 1 }}>
        {flag('hostsPublished', "Hosts' first names shown on the website")}
        <FormHelperText>
          {event
            ? 'Only their first names, nothing else about them.'
            : "Applies to the activity's events, where the hosts are chosen. Only their first names, nothing else."}
        </FormHelperText>
      </Box>
    </FormCard>
  );
};
