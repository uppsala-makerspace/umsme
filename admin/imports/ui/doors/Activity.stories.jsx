import React, { useState } from 'react';
import Box from '@mui/material/Box';
import { Activity } from './Activity';

const Placeholder = ({ children }) => <Box sx={{ p: 3, border: '1px dashed', borderColor: 'divider', color: 'text.secondary' }}>{children}</Box>;

const WithTab = (args) => {
  const [tab, setTab] = useState(args.tab);
  return <Activity {...args} tab={tab} onTab={setTab} />;
};

export default {
  title: 'Doors/Activity',
  component: Activity,
  render: (args) => <WithTab {...args} />,
  args: {
    tab: 'statistics',
    statistics: <Placeholder>The door statistics (DoorStats).</Placeholder>,
    unlocks: <Placeholder>The door unlocks (DoorUnlockList).</Placeholder>,
  },
};

export const Statistics = {};
export const Unlocks = { args: { tab: 'unlocks' } };
