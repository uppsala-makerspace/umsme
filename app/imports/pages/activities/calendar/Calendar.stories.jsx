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

// Today, two on one day, and one in the next month: the bubbles and the month headings.
const at = (days, h) => { const d = new Date(); d.setDate(d.getDate() + days); d.setHours(h, 0, 0, 0); return d; };
export const ByDay = {
  args: {
    events: [
      { ...events[0], _id: "d1", start: at(0, 18), end: at(0, 20) },
      { ...events[2], _id: "d2", start: at(1, 10), end: at(1, 12) },
      { ...events[0], _id: "d3", start: at(1, 18), end: at(1, 21), status: "awaiting" },
      { ...events[1], _id: "d4", start: at(40, 14), end: at(40, 17) },
    ],
  },
};
export const PastWithMore = { args: { when: "past", events: [...events].reverse(), hasMore: true } };
export const ReadOnly = { args: { canCreateEvent: false } };
export const Empty = { args: { events: [] } };
export const NoPast = { args: { when: "past", events: [] } };
