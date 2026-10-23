import React from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';

/**
 * A page's tabs, with a count after the name where there is one ("Messages
 * (3)"). Each tab is also a link (`href`), so it opens in a new browser tab
 * too; a plain click goes to `onChange`.
 *
 * @param {{ tabs: { value: string, label: string, count?: number }[], value: string,
 *           onChange: (value) => void, href: (value) => string }} props
 */
export const PageTabs = ({ tabs, value, onChange, href }) => (
  <Tabs value={value} onChange={(e, next) => onChange(next)} variant="scrollable" allowScrollButtonsMobile sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
    {tabs.map((t) => (
      <Tab key={t.value} value={t.value} label={t.count === undefined ? t.label : `${t.label} (${t.count})`}
        href={href(t.value)} onClick={(e) => e.preventDefault()} />
    ))}
  </Tabs>
);

/**
 * How wide a form, or text to read, is at most: wider, fields are hard to
 * match with their labels and lines hard to follow. Lists and tables take
 * the full width.
 */
export const FORM_WIDTH = 1100;

/**
 * A tab's content: kept while another tab shows, hidden, so its state stays.
 * With `form` (forms, images, text to read) it is at most FORM_WIDTH wide;
 * without (lists, tables) it takes the page's full width.
 */
export const TabPanel = ({ value, shown, label, form = false, children }) => (
  <Box role="tabpanel" hidden={value !== shown} aria-label={label} sx={form ? { maxWidth: FORM_WIDTH } : undefined}>{children}</Box>
);

/*
 * Inside a tab the tab's name is the heading; nothing repeats it. A tab
 * opens with its TabToolbar: what it is about (a grey note) on the left,
 * its actions ("Add membership") on the right, above what they act on. A
 * tab of several parts gives each part, the first too, a TabPart heading.
 */

/**
 * The top of a tab: a note on the left, actions on the right.
 *
 * @param {{ note?: React.ReactNode, children?: React.ReactNode }} props `children` are the actions
 */
export const TabToolbar = ({ note, children }) => (!note && !children ? null : (
  <Stack direction="row" spacing={2} useFlexGap sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', mb: 2 }}>
    <Typography variant="body2" color="text.secondary" sx={{ flex: 1, minWidth: 240 }}>{note}</Typography>
    {children && <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center' }}>{children}</Stack>}
  </Stack>
));

/**
 * One part of a tab of several: a small bold heading, with a count after it
 * where there is one and its actions on the right, then the part.
 *
 * @param {{ title: React.ReactNode, count?: number, actions?: React.ReactNode, children: React.ReactNode, sx?: object }} props
 */
export const TabPart = ({ title, count, actions, children, sx }) => (
  <Box component="section" sx={{ mb: 3, ...sx }}>
    <Stack direction="row" spacing={2} useFlexGap sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', mb: 0.5 }}>
      <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600 }}>{title}{count === undefined ? '' : ` (${count})`}</Typography>
      {actions && <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>{actions}</Stack>}
    </Stack>
    {children}
  </Box>
);
