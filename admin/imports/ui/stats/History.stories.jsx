import React, { useState } from 'react';
import { memberHistory } from '/imports/stats/memberStats';
import { History } from './History';
import { storyMemberships, storyMembers, storyNow } from './fixtures';

const history = memberHistory(storyMemberships, storyMembers, storyNow);
const Filtered = (props) => {
  const [filter, setFilter] = useState('active');
  return <History {...props} filter={filter} onFilterChange={setFilter} />;
};

export default {
  title: 'Statistics/History',
  component: History,
  render: (args) => <Filtered {...args} />,
  args: { loading: false, stats: history.stats, rows: history.rows },
};

export const Members = {};
export const Loading = { args: { loading: true, stats: undefined, rows: [] } };
