import Activities from "./Activities";
import { intro, fika } from "../components/fixtures";

export default {
  title: "Pages/Activities/List",
  component: Activities,
  args: { activities: [{ ...intro, plannedEvents: 2 }, { ...fika, plannedEvents: 0 }], canCreateActivity: true },
};

export const All = {};
export const ReadOnly = { args: { canCreateActivity: false } };
export const Empty = { args: { activities: [] } };
export const Loading = { args: { loading: true } };
