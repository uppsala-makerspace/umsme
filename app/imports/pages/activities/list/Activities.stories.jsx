import Activities from "./Activities";
import { intro, fika, events } from "../components/fixtures";

export default {
  title: "Pages/Activities/List",
  component: Activities,
  args: { activities: [intro, fika], events, canCreateActivity: true, canCreateEvent: true },
};

export const Upcoming = {};
export const AllActivities = { args: { initialTab: "all" } };
export const ReadOnly = { args: { canCreateActivity: false, canCreateEvent: false } };
export const Empty = { args: { activities: [], events: [] } };
export const Loading = { args: { loading: true } };
