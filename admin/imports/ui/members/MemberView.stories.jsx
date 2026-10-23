import React, { useState } from 'react';
import { fn } from 'storybook/test';
import { MemberView } from './MemberView';
import { memberValues } from './MemberForm';

const DAY = 86400000;
const now = new Date(2026, 9, 20);
const payer = {
  _id: 'm1', mid: '120', name: 'Fredrik Familj', email: 'family@example.org', mobile: '0701234567', family: true, registered: true,
  member: new Date(now.getTime() + 200 * DAY), lab: new Date(now.getTime() + 200 * DAY), reminderState: 'none', liability: true,
};
const detail = {
  status: { inconsistent: false },
  payer: null, user: { _id: 'u1', username: 'family@example.org' },
  familyMembers: [{ _id: 'm2', mid: '121', name: 'Frida Familj', email: 'family-member@example.org', member: payer.member, lab: payer.lab }],
  invites: [{ _id: 'i1', email: 'invited@example.org', invitee: { _id: 'm3', name: 'Ingrid Inbjuden' } }, { _id: 'i2', email: 'someone@example.org', invitee: null }],
  invitesReceived: [],
  memberships: [{ _id: 'ms1', start: new Date(2026, 3, 1), type: 'labandmember', amount: 2000, discount: false, family: true, memberend: payer.member, labend: payer.lab, pid: 'p1' }],
};
const on = Object.fromEntries(['refresh', 'register', 'exclude', 'remove', 'removeFromFamily', 'cancelInvite', 'declineInvite'].map((k) => [k, fn()]));

const Editable = (props) => {
  const [values, setValues] = useState(memberValues(props.member));
  return <MemberView {...props} values={values} onChange={(f, v) => setValues((c) => ({ ...c, [f]: v }))} />;
};

export default {
  title: 'Members/MemberView',
  component: MemberView,
  render: (args) => <Editable {...args} />,
  args: { member: payer, detail, now, on, onSave: fn() },
};

export const FamilyPayer = {};
export const Dependent = {
  args: {
    member: { ...payer, _id: 'm2', name: 'Frida Familj', infamily: 'm1' },
    detail: { ...detail, payer: { _id: 'm1', name: 'Fredrik Familj' }, familyMembers: [], invites: [], memberships: [] },
  },
};
export const Pending = { args: { member: { ...payer, family: false, registered: false, reminderState: 'needed', member: new Date(now.getTime() + 5 * DAY), lab: null }, detail: { ...detail, familyMembers: [], invites: [] } } };
export const DatesOutOfStep = { args: { detail: { ...detail, status: { inconsistent: true } } } };
export const InvitedElsewhere = { args: { member: { ...payer, family: false }, detail: { ...detail, familyMembers: [], invites: [], invitesReceived: [{ _id: 'i3', infamily: 'm9', inviterName: 'Ivar Inbjudare' }] } } };
