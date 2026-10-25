import React, { useState } from "react";
import { fn } from "storybook/test";
import Activities from "./Activities";
import { intro, fika, events } from "../components/fixtures";

const Tabbed = ({ tab: initialTab, when: initialWhen, ...props }) => {
  const [tab, setTab] = useState(initialTab);
  const [when, setWhen] = useState(initialWhen);
  return <Activities {...props} tab={tab} onTab={setTab} when={when} onWhen={setWhen} />;
};

export default {
  title: "Pages/Activities/List",
  component: Activities,
  render: (args) => <Tabbed {...args} />,
  args: {
    tab: "events", when: "upcoming", activities: [intro, fika], events,
    canCreateActivity: true, canCreateEvent: true, onLoadMore: fn(),
  },
};

export const Upcoming = {};
export const PastWithMore = { args: { when: "past", events: [...events].reverse(), hasMore: true } };
export const AllActivities = { args: { tab: "activities" } };
export const ReadOnly = { args: { canCreateActivity: false, canCreateEvent: false } };
export const Empty = { args: { activities: [], events: [] } };
export const NoPast = { args: { when: "past", events: [] } };
