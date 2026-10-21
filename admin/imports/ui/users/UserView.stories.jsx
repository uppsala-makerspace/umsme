import React, { useState } from 'react';
import { fn } from 'storybook/test';
import { UserView } from './UserView';

const detail = {
  user: { _id: 'u1', username: 'board@example.org', emails: [{ address: 'board@example.org', verified: true }] },
  roles: ['board'], member: { _id: 'm1', name: 'Bertil Styrelse' }, canSetRoles: true, self: false,
};

const Editable = (props) => {
  const [values, setValues] = useState({ username: props.detail.user.username || '', email: props.detail.user.emails?.[0]?.address || '' });
  return <UserView {...props} values={values} onChange={(f, v) => setValues((c) => ({ ...c, [f]: v }))} />;
};

export default {
  title: 'Users/UserView',
  component: UserView,
  render: (args) => <Editable {...args} />,
  args: { detail, onSave: fn(), on: { setRole: fn(), setPassword: fn(async () => true), remove: fn() } },
};

export const Board = {};
export const NotAdmin = { args: { detail: { ...detail, canSetRoles: false } } };
export const AdminLogin = { args: { detail: { ...detail, user: { _id: 'u0', username: 'admin', emails: [] }, roles: ['admin'], member: null, self: true } } };
