import React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { DataList } from '../components/DataList';
import { linkColumn } from '../components/columns';
import { activityPath } from './paths';

/**
 * The activities.
 *
 * @param {{ loading: boolean, activities: object[], groupName: (id) => string,
 *           categoryName: (id) => string, workshopName: (id) => string,
 *           groupWorkshops?: Object<string, string> }} props
 */
export const ActivityList = ({ loading, activities, groupName, categoryName, workshopName, groupWorkshops = {} }) => {
  const columns = [
    linkColumn('name', 'Name', (a) => activityPath(a._id), { valueGetter: (value) => value?.sv || '' }),
    { field: 'groupId', headerName: 'Group', width: 220, valueGetter: (value) => (value ? groupName(value) || '' : 'The association') },
    { field: 'categoryId', headerName: 'Category', width: 180, valueGetter: (value) => (value ? categoryName(value) || '' : '') },
    // Left empty, the group's workshop (groupWorkshopIds), marked as such.
    { field: 'workshopId', headerName: 'Shown at', width: 220, valueGetter: (value, row) => {
      if (value) return workshopName(value) || '';
      const fromGroup = groupWorkshops[row.groupId];
      return fromGroup ? `${workshopName(fromGroup) || ''} (from the group)` : '';
    } },
    { field: 'published', headerName: 'Website', width: 110, valueGetter: (value) => (value ? 'Shown' : '') },
  ];
  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1">Activities</Typography>
        <Button variant="contained" href="/activities/add">Add activity</Button>
      </Stack>
      <DataList
        rowHref={(a) => activityPath(a._id)}
        rows={activities}
        columns={columns}
        loading={loading}
        empty="No activities yet."
        defaultSort={{ field: 'name', sort: 'asc' }}
      />
    </Box>
  );
};
