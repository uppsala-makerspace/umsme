import React, { useState } from 'react';
import { EventList } from './EventList';
import { activities, events, groupName, now } from './fixtures';

const Tabbed = ({ initialTab = 'upcoming', ...props }) => {
  const [tab, setTab] = useState(initialTab);
  return <EventList {...props} tab={tab} onTab={setTab} />;
};

export default {
  title: 'Activities/EventList',
  component: EventList,
  render: (args) => <Tabbed {...args} />,
  args: { loading: false, events, activities, groupName, now },
};

export const Upcoming = {};
export const Past = { args: { initialTab: 'past' } };
