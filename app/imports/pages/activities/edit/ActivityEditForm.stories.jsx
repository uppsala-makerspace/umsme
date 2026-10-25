import React, { useState } from "react";
import { fn } from "storybook/test";
import ActivityEditForm from "./ActivityEditForm";
import { activityValues } from "/imports/common/lib/activityValues";
import { choices } from "../components/fixtures";

const Editable = ({ values: initial, ...props }) => {
  const [values, setValues] = useState(initial);
  return <ActivityEditForm {...props} values={values} onChange={(f, v) => setValues((c) => ({ ...c, [f]: v }))} />;
};

const stored = { name: { sv: "Introduktion träverkstaden" }, description: { sv: "Säkerhet och maskiner." }, groupId: "g1", categoryId: "c1", durationMinutes: 120, membersOnly: true };

export default {
  title: "Pages/Activities/ActivityEditForm",
  component: ActivityEditForm,
  render: (args) => <Editable {...args} />,
  args: { choices, onSave: fn(), onCancel: fn(), onDelete: fn() },
};

export const New = { args: { isNew: true, values: activityValues(null, { groupId: "g1" }) } };
export const Existing = { args: { isNew: false, values: activityValues(stored), hasEvents: false } };
export const WithEvents = { args: { isNew: false, values: activityValues(stored), hasEvents: true } };
export const Failed = { args: { isNew: true, values: activityValues(null), error: "An activity needs a Swedish name" } };
