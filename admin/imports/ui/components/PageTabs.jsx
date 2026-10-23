import React from 'react';
import Box from '@mui/material/Box';
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

/** A tab's content: kept while another tab shows, hidden, so its state stays. */
export const TabPanel = ({ value, shown, label, children }) => (
  <Box role="tabpanel" hidden={value !== shown} aria-label={label}>{children}</Box>
);
