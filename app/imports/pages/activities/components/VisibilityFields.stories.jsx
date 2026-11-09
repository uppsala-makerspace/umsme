import React, { useState } from "react";
import VisibilityFields from "./VisibilityFields";

/** Keeps the values, as the forms do. */
const Editable = ({ values: initial, ...props }) => {
  const [values, setValues] = useState(initial);
  return <VisibilityFields {...props} values={values} onChange={(field, value) => setValues((v) => ({ ...v, [field]: value }))} />;
};

export default {
  title: "Pages/Activities/VisibilityFields",
  component: VisibilityFields,
  render: (args) => <Editable {...args} />,
};

/** An activity: checkboxes; the hosts' choice is for its events. */
export const Activity = { args: { values: { published: true, hostsPublished: false } } };

/** An event of an activity: as the activity, yes or no. */
export const EventOfActivity = {
  args: { event: true, inherited: { published: true, hostsPublished: true }, values: { published: "", hostsPublished: "no" } },
};

/** A free-standing event: yes or no, nothing to take after. */
export const FreeStandingEvent = { args: { event: true, values: { published: "yes", hostsPublished: "" } } };
