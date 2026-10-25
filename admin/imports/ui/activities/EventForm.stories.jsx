import React, { useState } from 'react';
import { fn } from 'storybook/test';
import { EventForm } from './EventForm';
import { eventValues } from './values';
import { groups, groupName, categories, workshopOptions, spaceOptions, intro, activities, events, hosts } from './fixtures';

/** Keeps the values, as the page does. */
const Editable = ({ values: initial, initialTab = 'details', ...props }) => {
  const [current, setCurrent] = useState(initial);
  const [tab, setTab] = useState(initialTab);
  return <EventForm {...props} values={current} onChange={(field, value) => setCurrent((v) => ({ ...v, [field]: value }))} tab={tab} onTab={setTab} />;
};

const search = async () => hosts;
const picture = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#c8a26b"/></svg>')}`;

export default {
  title: 'Activities/EventForm',
  component: EventForm,
  render: (args) => <Editable {...args} />,
  args: {
    isNew: false, event: events[1], activity: intro, values: eventValues(events[1]), activities, groups, groupName, categories,
    workshopOptions, spaceOptions, hosts, searchMembers: search, onAddHost: fn(), onRemoveHost: fn(),
    onSave: fn(), onDelete: fn(), onUploadImage: fn(), onRemoveImage: fn(),
  },
};

export const OfAnActivity = {};
export const InheritedImage = { args: { initialTab: 'image', imageUrl: picture, ownImage: false } };
export const Cancelled = { args: { event: events[2], activity: activities[1], values: eventValues(events[2]), hosts: [] } };
export const FreeStanding = { args: { event: events[3], activity: null, values: eventValues(events[3]), hosts: [] } };
export const NewOfAnActivity = { args: { isNew: true, event: undefined, values: eventValues(null, { activityId: 'a1' }), hosts: [] } };
export const NewFreeStanding = { args: { isNew: true, event: undefined, activity: null, values: eventValues(null), hosts: [] } };
