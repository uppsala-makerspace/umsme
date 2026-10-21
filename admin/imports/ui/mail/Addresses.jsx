import React from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';

/**
 * Mail addresses ("Name <email>") as chips in a box that scrolls past a
 * few rows; with `onRemove` each can be taken away.
 *
 * @param {{ addresses: string[], onRemove?: (address) => void, empty?: string }} props
 */
export const Addresses = ({ addresses, onRemove, empty = 'None.' }) => (addresses.length === 0
  ? <Typography variant="body2" color="text.secondary">{empty}</Typography>
  : (
    <Box sx={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: 0.75, p: 1, border: 1, borderColor: 'divider', borderRadius: 1 }}>
      {addresses.map((a) => <Chip key={a} size="small" label={a} {...(onRemove ? { onDelete: () => onRemove(a) } : {})} />)}
    </Box>
  ));
