import React, { useState } from 'react';
import { fn } from 'storybook/test';
import { MembershipForm } from './MembershipForm';

const member = { _id: 'm1', name: 'Fredrik Familj' };
const membership = { _id: 'ms1', amount: 1600, start: new Date(2026, 6, 1), type: 'labandmember', family: true, discount: false, memberend: new Date(2027, 6, 8), labend: new Date(2027, 6, 8) };

const Editable = ({ values: initial, ...props }) => {
  const [values, setValues] = useState(initial);
  return <MembershipForm {...props} values={values} onChange={(f, v) => setValues((c) => ({ ...c, [f]: v }))} />;
};

export default {
  title: 'Payments/MembershipForm',
  component: MembershipForm,
  render: (args) => <Editable {...args} />,
  args: { member, onSave: fn(), onDelete: fn() },
};

export const NewFromPayment = { args: { isNew: true, values: { amount: 200, start: '2026-10-20' } } };
export const FamilyMembership = {
  args: {
    isNew: false, membership, dependents: ['Frida Familj', 'Filip Familj'],
    payment: { _id: 'p1', type: 'swish', amount: 1600, date: new Date(2026, 6, 1), message: 'familyLab' },
    values: { amount: 1600, start: '2026-07-01', type: 'labandmember', family: true, discount: false, memberend: '2027-07-08', labend: '2027-07-08' },
  },
};
