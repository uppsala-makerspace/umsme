import React, { useState } from 'react';
import { fn } from 'storybook/test';
import { SpaceForm } from './SpaceForm';

const room = { _id: 's1', spaceId: 'ceramics_workshop', floor: 'floor2', name: { sv: 'Keramikverkstaden', en: 'Ceramics workshop' }, slackChannels: ['#keramik'] };
const values = (space) => ({
  spaceId: space.spaceId || '', floor: space.floor || 'floor1', nameSv: space.name?.sv || '', nameEn: space.name?.en || '',
  descriptionSv: '', descriptionEn: '', slackChannels: (space.slackChannels || []).join(', '), iconSize: space.iconSize ?? '',
});
const noLinks = { workshops: [], groups: [] };

/** Keeps the values, as the page does. */
const Editable = ({ values: initial, ...props }) => {
  const [current, setCurrent] = useState(initial);
  return <SpaceForm {...props} values={current} onChange={(field, value) => setCurrent((v) => ({ ...v, [field]: value }))} />;
};

export default {
  title: 'Spaces/SpaceForm',
  component: SpaceForm,
  render: (args) => <Editable {...args} />,
  args: { isNew: false, space: room, values: values(room), links: noLinks, onSave: fn(), onDelete: fn(), onUploadIcon: fn(), onRemoveIcon: fn() },
};

export const NewSpace = { args: { isNew: true, space: null, values: values({}), links: null } };

/** Nothing links to it and it has no icon: it can be deleted. */
export const Free = {};

export const Linked = {
  args: {
    links: {
      workshops: [{ _id: 'w1', name: { sv: 'Keramikverkstaden' }, isPrimary: true }],
      groups: [{ _id: 'g1', name: { sv: 'Styrgrupp Keramik' }, isPrimary: false }],
    },
  },
};

export const SaveRefused = { args: { error: 'Someone else changed this space; reload it and try again' } };
