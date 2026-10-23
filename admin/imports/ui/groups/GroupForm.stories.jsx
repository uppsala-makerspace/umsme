import React, { useState } from 'react';
import { fn } from 'storybook/test';
import { GroupForm } from './GroupForm';

const groups = [
  { _id: 'g1', name: { sv: 'Styrgrupp Keramik' }, type: 'steering' },
  { _id: 'g2', name: { sv: 'Lokalgruppen' }, type: 'function' },
  { _id: 'g3', name: { sv: 'Glasyrgruppen' }, type: 'responsibility', parentGroupId: 'g1' },
];
const workshopOptions = [
  { value: 'w1', label: 'Keramikverkstaden', group: 'Workshops' },
  { value: 'w2', label: 'Retrodatorer', group: 'Areas of interest' },
];
const spaceOptions = [{ value: 's1', label: 'Keramikrummet (Floor 2)', group: 'Floor 2' }, { value: 's2', label: 'Stora rummet (Floor 1)', group: 'Floor 1' }];
const roleOptions = [{ value: 'board', label: 'board' }, { value: 'storage', label: 'storage' }];
const gustav = { _id: 'm1', name: 'Gustav Gruppledare', mid: '1001' };
const people = [gustav, { _id: 'm2', name: 'Sara Styrgrupp', mid: '1002' }, { _id: 'm3', name: 'Bo Basmedlem', mid: '1003' }];
const searchMembers = async (query) => people.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));

const steering = {
  _id: 'g1', name: { sv: 'Styrgrupp Keramik' }, type: 'steering', description: { sv: 'Sköter keramikverkstaden.' },
  slackChannel: '#keramik', responsibleMemberId: 'm1', allowJoinRequests: false, joinPolicy: 'request-any',
};
const values = (g) => ({
  nameSv: g.name?.sv || '', nameEn: '', tagSv: '', tagEn: '', descriptionSv: g.description?.sv || '', descriptionEn: '',
  rulesSv: '', rulesEn: '', type: g.type || '', parentGroupId: g.parentGroupId || '', slackChannel: g.slackChannel || '',
  guidesUrl: '', responsibleMemberId: g.responsibleMemberId || '', allowJoinRequests: g.allowJoinRequests !== false,
  joinPolicy: g.joinPolicy || 'request-responsible', linkedRole: '', primarySpaceId: '', secondarySpaceIds: [],
  relatedWorkshopIds: [], relatedGroupIds: [],
});
const members = {
  active: [{ memberId: 'm1', name: 'Gustav Gruppledare', mid: '1001', isResponsible: true }, { memberId: 'm2', name: 'Sara Styrgrupp', mid: '1002' }],
  pending: [{ memberId: 'm3', name: 'Bo Basmedlem', mid: '1003' }],
};
const inUse = {
  workshop: { _id: 'w1', name: { sv: 'Keramikverkstaden' }, kind: 'workshop' },
  childGroups: [{ _id: 'g3', type: 'responsibility', name: { sv: 'Glasyrgruppen' } }],
  relatedGroups: [{ _id: 'g4', type: 'function', name: { sv: 'Kursgruppen' } }],
  expenseAccounts: [{ _id: 'e1', name: 'Keramik', member: true, approver: true }],
  memberships: 3,
};

/** Keeps the values and the picked responsible, as the page does. */
const Editable = ({ values: initial, responsible: picked, initialTab = 'details', ...props }) => {
  const [current, setCurrent] = useState(initial);
  const [tab, setTab] = useState(initialTab);
  const [responsible, setResponsible] = useState(picked);
  return (
    <GroupForm {...props} tab={tab} onTab={setTab} values={current} responsible={responsible}
      onChange={(field, value) => setCurrent((v) => ({ ...v, [field]: value }))}
      onResponsibleChange={(m) => { setResponsible(m); setCurrent((v) => ({ ...v, responsibleMemberId: m?._id || '' })); }} />
  );
};

export default {
  title: 'Groups/GroupForm',
  component: GroupForm,
  render: (args) => <Editable {...args} />,
  args: {
    isNew: false, group: steering, values: values(steering), groups, workshopOptions, spaceOptions, roleOptions,
    responsible: gustav, searchMembers, members, references: inUse,
    onSave: fn(), onDelete: fn(), onUploadImage: fn(), onRemoveImage: fn(),
    onAddMember: fn(), onApprove: fn(), onReject: fn(), onRemoveMember: fn(),
  },
};

export const NewGroup = { args: { isNew: true, group: null, values: values({}), responsible: null, members: null, references: null } };

/** A steering group with a workshop, members and a request: it can not be deleted. */
export const InUse = {};
export const MembersTab = { args: { initialTab: 'members' } };
export const ReferencesTab = { args: { initialTab: 'references' } };

/** A function group picks its spaces; nothing refers to it, so it can be deleted. */
export const FunctionGroup = {
  args: (() => {
    const group = { _id: 'g2', name: { sv: 'Lokalgruppen' }, type: 'function', primarySpaceId: 's2' };
    return {
      group, values: { ...values(group), primarySpaceId: 's2', relatedWorkshopIds: ['w1'] }, responsible: null,
      members: { active: [], pending: [] }, references: { workshop: null, childGroups: [], relatedGroups: [], expenseAccounts: [], memberships: 0 },
    };
  })(),
};

export const SaveRefused = { args: { error: 'A group that grants a role cannot be open to anyone joining' } };
