import React, { useState } from "react";
import Activities, { NO_WORKSHOP } from "./Activities";
import { intro, fika } from "../components/fixtures";

const Filtered = ({ workshop: initial, ...props }) => {
  const [workshop, setWorkshop] = useState(initial);
  return <Activities {...props} workshop={workshop} onWorkshop={setWorkshop} />;
};

export default {
  title: "Pages/Activities/List",
  component: Activities,
  render: (args) => <Filtered {...args} />,
  args: { workshop: "", activities: [{ ...intro, plannedEvents: 2 }, { ...fika, plannedEvents: 0 }], canCreateActivity: true },
};

export const All = {};
export const AtNoWorkshop = { args: { workshop: NO_WORKSHOP } };
export const ReadOnly = { args: { canCreateActivity: false } };
export const Empty = { args: { activities: [] } };
export const Loading = { args: { loading: true } };
