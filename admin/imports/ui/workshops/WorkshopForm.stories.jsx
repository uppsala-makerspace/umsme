import React, { useState } from 'react';
import { fn } from 'storybook/test';
import { WorkshopForm } from './WorkshopForm';

const groups = [{ _id: 'g1', name: { sv: 'Styrgrupp Keramik' }, type: 'steering' }, { _id: 'g2', name: { sv: 'Styrgrupp Trä' }, type: 'steering' }];
const spaceOptions = [
  { value: 's1', label: 'Keramikrummet (Floor 2)', group: 'Floor 2' },
  { value: 's2', label: 'Glasering (Floor 2)', group: 'Floor 2' },
  { value: 's3', label: 'Stora rummet (Floor 1)', group: 'Floor 1' },
];
const ceramics = {
  _id: 'w1', kind: 'workshop', status: 'established', name: { sv: 'Keramikverkstaden', en: 'Ceramics workshop' },
  description: { sv: 'Drejning och glasering.' }, slackChannel: '#keramik', groupId: 'g1', primarySpaceId: 's1', secondarySpaceIds: ['s2'],
};
const values = (w) => ({
  kind: w.kind || 'workshop', nameSv: w.name?.sv || '', nameEn: w.name?.en || '', tagSv: '', tagEn: '',
  descriptionSv: w.description?.sv || '', descriptionEn: '', rulesSv: '', rulesEn: '', status: w.status || 'forming',
  slackChannel: w.slackChannel || '', guidesUrl: '', groupId: w.groupId || '', primarySpaceId: w.primarySpaceId || '',
  secondarySpaceIds: w.secondarySpaceIds || [],
});
const none = { certificates: [], storeItems: [], relatedGroups: [], viaGroup: null };
const details = { activeMemberCount: 2, ...none };

/** Keeps the values, as the page does. */
const Editable = ({ values: initial, initialTab = 'details', ...props }) => {
  const [current, setCurrent] = useState(initial);
  const [tab, setTab] = useState(initialTab);
  return <WorkshopForm {...props} values={current} onChange={(field, value) => setCurrent((v) => ({ ...v, [field]: value }))} tab={tab} onTab={setTab} />;
};

export default {
  title: 'Workshops/WorkshopForm',
  component: WorkshopForm,
  render: (args) => <Editable {...args} />,
  args: {
    isNew: false, workshop: ceramics, values: values(ceramics), groups, spaceOptions, details,
    onSave: fn(), onDelete: fn(), onUploadImage: fn(), onRemoveImage: fn(),
  },
};

export const NewWorkshop = { args: { isNew: true, workshop: null, values: values({}), details: null } };

/** No image yet, so the guideline is not met; nothing stops deleting it. */
export const Incomplete = {};

export const Complete = {
  args: { workshop: { ...ceramics, imageFileId: 'f1' }, imageUrl: 'https://placehold.co/400x300?text=Keramik', initialTab: 'image' },
};

export const WithCertificates = {
  args: {
    initialTab: 'references',
    details: {
      activeMemberCount: 1,
      certificates: [{ _id: 'c1', name: { sv: 'Drejskivan' } }, { _id: 'c2', name: { sv: 'Brännugnen' } }],
      storeItems: [{ _id: 's1', code: 'lera', name: { sv: 'Lera, 10 kg' } }],
      relatedGroups: [{ _id: 'g9', type: 'function', name: { sv: 'Kursgruppen' } }],
      viaGroup: {
        group: { _id: 'g1', name: { sv: 'Styrgrupp Keramik' } },
        responsibilityGroups: [{ _id: 'g2', type: 'responsibility', name: { sv: 'Glasyransvariga' } }],
        relatedGroups: [],
        expenseAccounts: [{ _id: 'a1', name: 'Keramik', member: true, approver: false }, { _id: 'a2', name: 'Material', member: false, approver: true }],
      },
    },
  },
};

export const AreaOfInterest = {
  args: (() => {
    const retro = { _id: 'w2', kind: 'areaOfInterest', status: 'trial', name: { sv: 'Retrodatorer' } };
    return { workshop: retro, values: values(retro), details: { activeMemberCount: 0, ...none } };
  })(),
};

export const SaveRefused = { args: { error: 'Someone else changed this workshop; reload it and try again' } };
