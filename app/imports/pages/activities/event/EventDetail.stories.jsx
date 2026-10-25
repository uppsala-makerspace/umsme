import EventDetail from "./EventDetail";
import { intro, events, hosts } from "../components/fixtures";

export default {
  title: "Pages/Activities/Event",
  component: EventDetail,
  args: { loading: false, data: { event: events[0], hosts: hosts.slice(0, 1), activityName: intro.name, canEdit: true } },
};

export const OfAnActivity = {};
export const Cancelled = { args: { data: { event: events[1], hosts: [], activityName: { sv: "Pysselfika" }, canEdit: false } } };
export const FreeStanding = { args: { data: { event: events[2], hosts, activityName: null, canEdit: false } } };
