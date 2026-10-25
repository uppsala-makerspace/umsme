import React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { DataList } from '../components/DataList';
import { PageTabs, TabPanel, TabToolbar } from '../components/PageTabs';
import { eventColumns } from './eventColumns';
import { addEventPath, eventPath } from './paths';

const TABS = [['upcoming', 'Upcoming'], ['past', 'Past']];

/**
 * The events, of activities and free-standing, in two tabs: those not yet
 * over, soonest first, and those over, latest first.
 *
 * @param {{ loading: boolean, events: object[], activities: object[], groupName: (id) => string,
 *           now: Date, tab?: string, onTab?: (tab) => void }} props
 */
export const EventList = ({ loading, events, activities, groupName, now, tab = 'upcoming', onTab }) => {
  const shown = TABS.some(([t]) => t === tab) ? tab : 'upcoming';
  const activityOf = (e) => activities.find((a) => a._id === e.activityId) || null;
  const columns = eventColumns({ activityOf, groupName, withActivity: true });
  const upcoming = events.filter((e) => e.end >= now);
  const past = events.filter((e) => e.end < now);
  const list = (rows, sort, empty) => (
    <DataList rows={rows} columns={columns} loading={loading} empty={empty} rowHref={(e) => eventPath(e._id)} defaultSort={{ field: 'start', sort }} />
  );
  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1">Events</Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" href="/events/import">Import from calendar</Button>
          <Button variant="contained" href={addEventPath()}>Add free-standing event</Button>
        </Stack>
      </Stack>
      <PageTabs
        tabs={[{ value: 'upcoming', label: 'Upcoming', count: upcoming.length }, { value: 'past', label: 'Past', count: past.length }]}
        value={shown} onChange={onTab} href={(t) => (t === 'upcoming' ? '/events' : `/events?tab=${t}`)} />
      <TabPanel value="upcoming" shown={shown} label="Upcoming">
        <>
          <TabToolbar note="An event of an activity is added on the activity's page, under Events." />
          {list(upcoming, 'asc', 'No events to come.')}
        </>
      </TabPanel>
      <TabPanel value="past" shown={shown} label="Past">{list(past, 'desc', 'No events yet.')}</TabPanel>
    </Box>
  );
};
