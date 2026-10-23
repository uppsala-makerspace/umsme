import React from 'react';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import { TabPart } from './PageTabs';

/**
 * One kind of thing in a References tab: a heading with the count, and a
 * line per item. Nothing at all when there are none.
 *
 * @param {{ title: string, items: { _id: string }[], render: (item) => React.ReactNode }} props
 */
export const ReferenceKind = ({ title, items, render }) => (items.length === 0 ? null : (
  <TabPart title={title} count={items.length} sx={{ mb: 2 }}>
    <List dense disablePadding>
      {items.map((item) => <ListItem key={item._id} disableGutters sx={{ gap: 1 }}>{render(item)}</ListItem>)}
    </List>
  </TabPart>
));
