import React from 'react';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import Typography from '@mui/material/Typography';

/**
 * One kind of thing in a References tab: a heading with the count, and a
 * line per item. Nothing at all when there are none.
 *
 * @param {{ title: string, items: { _id: string }[], render: (item) => React.ReactNode }} props
 */
export const ReferenceKind = ({ title, items, render }) => (items.length === 0 ? null : (
  <Box sx={{ mb: 2 }}>
    <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600 }}>{title} ({items.length})</Typography>
    <List dense disablePadding>
      {items.map((item) => <ListItem key={item._id} disableGutters sx={{ gap: 1 }}>{render(item)}</ListItem>)}
    </List>
  </Box>
));
