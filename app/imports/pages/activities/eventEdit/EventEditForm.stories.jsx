import React, { useState } from "react";
import { fn } from "storybook/test";
import EventEditForm from "./EventEditForm";
import { eventValues } from "/imports/common/lib/activityValues";
import { choices, hosts } from "../components/fixtures";

const Editable = ({ values: initial, ...props }) => {
  const [values, setValues] = useState(initial);
  return <EventEditForm {...props} values={values} onChange={(f, v) => setValues((c) => ({ ...c, [f]: v }))} />;
};

const activity = { _id: "a1", name: { sv: "Introduktion träverkstaden", en: "Wood workshop introduction" }, description: { sv: "Säkerhet och maskiner." }, groupId: "g1", categoryId: "c1", workshopId: "w1", durationMinutes: 120, membersOnly: true };
const stored = { activityId: "a1", groupId: "g1", start: new Date(2026, 10, 19, 18), end: new Date(2026, 10, 19, 20), status: "confirmed", hostMemberIds: ["m1"] };

export default {
  title: "Pages/Activities/EventEditForm",
  component: EventEditForm,
  render: (args) => <Editable {...args} />,
  args: { choices, activity, hostChoices: hosts, onSave: fn(), onCancel: fn(), onDelete: fn() },
};

export const OfAnActivity = { args: { isNew: false, values: eventValues(stored) } };
export const NewOfAnActivity = { args: { isNew: true, values: eventValues(null, { activityId: "a1" }) } };
export const NewFreeStanding = { args: { isNew: true, activity: null, values: { ...eventValues(null), groupId: "g2" } } };
export const Failed = { args: { isNew: true, values: eventValues(null, { activityId: "a1" }), error: "Give the day and the start time." } };
const picture = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400"><rect width="800" height="400" fill="#c8a26b"/></svg>')}`;
export const InheritedImage = { args: { isNew: false, values: eventValues(stored), image: { imageUrl: picture, inherited: true, onSelect: fn(), onRemove: fn() } } };

