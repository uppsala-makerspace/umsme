import React, { useState } from 'react';
import { fn } from 'storybook/test';
import { ActivityForm } from './ActivityForm';
import { activityValues } from './values';
import { groups, groupName, categories, workshopOptions, spaceOptions, intro, events } from './fixtures';

/** Keeps the values, as the page does. */
const Editable = ({ values: initial, initialTab = 'details', ...props }) => {
  const [current, setCurrent] = useState(initial);
  const [tab, setTab] = useState(initialTab);
  return <ActivityForm {...props} values={current} onChange={(field, value) => setCurrent((v) => ({ ...v, [field]: value }))} tab={tab} onTab={setTab} />;
};

export default {
  title: 'Activities/ActivityForm',
  component: ActivityForm,
  render: (args) => <Editable {...args} />,
  args: {
    isNew: false, activity: intro, events: events.filter((e) => e.activityId === 'a1'), values: activityValues(intro),
    groups, groupName, categories, workshopOptions, spaceOptions,
    onSave: fn(), onDelete: fn(), onUploadImage: fn(), onRemoveImage: fn(),
  },
};

export const Details = {};
export const EventsTab = { args: { initialTab: 'events' } };
export const ImageTab = { args: { initialTab: 'image' } };
export const Deletable = { args: { events: [] } };
export const New = { args: { isNew: true, activity: undefined, events: [], values: activityValues(null) } };
