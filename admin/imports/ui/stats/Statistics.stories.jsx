import React, { useState } from 'react';
import { membershipStatistics } from '/imports/stats/memberStats';
import { Statistics } from './Statistics';
import { storyMemberships, storyNow } from './fixtures';

const Periods = (props) => {
  const [interval, setPeriod] = useState('all');
  return <Statistics {...props} interval={interval} onIntervalChange={setPeriod} statistics={membershipStatistics(storyMemberships, interval, storyNow)} />;
};

export default {
  title: 'Statistics/Statistics',
  component: Statistics,
  render: (args) => <Periods {...args} />,
};

export const Memberships = {};
export const Counting = { render: () => <Statistics interval="all" onIntervalChange={() => {}} /> };
