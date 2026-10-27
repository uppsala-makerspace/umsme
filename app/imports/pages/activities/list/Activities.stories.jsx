import Activities from "./Activities";
import { intro, fika } from "../components/fixtures";

export default {
  title: "Pages/Activities/List",
  component: Activities,
  args: { activities: [intro, fika], canCreateActivity: true },
};

export const All = {};
export const ReadOnly = { args: { canCreateActivity: false } };
export const Empty = { args: { activities: [] } };
export const Loading = { args: { loading: true } };
