import React, { useState } from "react";
import { fn } from "storybook/test";
import Calendar from "./Calendar";
import { events } from "../components/fixtures";

const Chosen = ({ when: initial, ...props }) => {
  const [when, setWhen] = useState(initial);
  return <Calendar {...props} when={when} onWhen={setWhen} />;
};

export default {
  title: "Pages/Activities/Calendar",
  component: Calendar,
  render: (args) => <Chosen {...args} />,
  args: { when: "upcoming", events, canCreateEvent: true, onLoadMore: fn() },
};

export const Upcoming = {};
export const PastWithMore = { args: { when: "past", events: [...events].reverse(), hasMore: true } };
export const ReadOnly = { args: { canCreateEvent: false } };
export const Empty = { args: { events: [] } };
export const NoPast = { args: { when: "past", events: [] } };
