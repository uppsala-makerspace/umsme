import React from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';

// The heading bands, as in the app: light blue for an activity, light green
// for an event, so the two forms, alike as they are, are told apart at a glance.
const BANDS = {
  activity: { bgcolor: '#f0f9ff', borderColor: '#e0f2fe', color: '#075985' },
  event: { bgcolor: '#f0fdf4', borderColor: '#dcfce7', color: '#166534' },
};

/**
 * A part of the activity or event form, as a card with its heading in a
 * coloured band, so a long form reads in parts.
 *
 * @param {{ title: string, kind?: 'activity'|'event', children: React.ReactNode }} props
 */
export const FormCard = ({ title, kind = 'event', children }) => (
  <Paper variant="outlined" component="section" sx={{ mb: 2, overflow: 'hidden' }}>
    <Box sx={{ px: 2, py: 1, borderBottom: 1, ...BANDS[kind] }}>
      <Typography component="h2" variant="overline" sx={{ fontWeight: 600, lineHeight: 1.6, letterSpacing: '0.08em' }}>
        {title}
      </Typography>
    </Box>
    <Box sx={{ p: 2, pb: 0 }}>{children}</Box>
  </Paper>
);
