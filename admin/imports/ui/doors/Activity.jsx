import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { PageTabs, TabPanel } from '../components/PageTabs';

export const ACTIVITY_TABS = ['statistics', 'unlocks'];
const LABELS = { statistics: 'Door statistics', unlocks: 'Door unlocks' };

/** The Activity page's path, on a tab; the first tab has none. */
export const activityPath = (tab) => (tab && tab !== 'statistics' ? `/activity?tab=${tab}` : '/activity');

/**
 * The activity in the space: the door statistics (visits per day, month,
 * quarter, year; weekdays; hours) and the list of door unlocks, as tabs.
 * Both tabs stay mounted while the other shows. Full width: an overview.
 *
 * @param {{ tab: string, onTab: (tab) => void, statistics: React.ReactNode, unlocks: React.ReactNode }} props
 *   `tab` one of ACTIVITY_TABS; another shows the statistics.
 */
export const Activity = ({ tab, onTab, statistics, unlocks }) => {
  const shown = ACTIVITY_TABS.includes(tab) ? tab : 'statistics';
  return (
    <Box>
      <Typography variant="h4" component="h1" sx={{ mb: 1 }}>Activity</Typography>
      <PageTabs tabs={ACTIVITY_TABS.map((t) => ({ value: t, label: LABELS[t] }))} value={shown} onChange={onTab} href={activityPath} />
      <TabPanel value="statistics" shown={shown} label={LABELS.statistics}>{statistics}</TabPanel>
      <TabPanel value="unlocks" shown={shown} label={LABELS.unlocks}>{unlocks}</TabPanel>
    </Box>
  );
};
