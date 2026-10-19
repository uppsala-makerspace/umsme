import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

/** A titled part of a page, with an optional note under the title. */
export const Section = ({ title, note, children, sx }) => (
  <Box component="section" sx={{ mt: 4, ...sx }}>
    <Typography variant="h6" component="h2" sx={{ mb: note ? 0.5 : 1 }}>{title}</Typography>
    {note && <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{note}</Typography>}
    {children}
  </Box>
);
