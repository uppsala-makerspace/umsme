import React, { useState } from 'react';
import { fn } from 'storybook/test';
import { LockSync } from './LockSync';

const rows = [
  { _id: 'm1', name: 'Maja Medlem', email: 'member@example.org', lockId: 'user-1', labEnd: '2027-03-01', lockEnd: '2027-03-01', status: 'correct', fix: false },
  { _id: 'm2', name: 'Dagny Rabatt', email: 'discounted@example.org', lockId: 'user-2', labEnd: '2027-01-20', lockEnd: '2026-12-21', status: 'wrong', fix: true },
  { _id: 'm3', name: 'Kalle Kvartal', email: 'quarterly@example.org', lockId: null, labEnd: '2026-12-01', lockEnd: null, status: 'invited', fix: false },
  { _id: 'm4', name: 'Olle Gammalavtal', email: 'outdated@example.org', lockId: null, labEnd: '2026-12-15', lockEnd: null, status: 'noaccount', fix: false },
  { _id: 'm5', name: 'Ulla Utesluten', email: 'excluded@example.org', lockId: 'user-5', labEnd: '2027-02-10', lockEnd: null, status: 'stale', fix: false },
];

const Filtered = (props) => {
  const [shown, setShown] = useState(['wrong', 'stale']);
  return <LockSync {...props} shown={shown} onShownChange={setShown} />;
};

export default {
  title: 'Lock/LockSync',
  component: LockSync,
  render: (args) => <Filtered {...args} />,
  args: { rows, onSynchronize: fn(), onFix: fn() },
};

export const Synchronized = {};
export const BeforeSynchronizing = { args: { rows: null } };
export const Asking = { args: { rows: null, busy: true } };
export const LockUnreachable = { args: { rows: null, error: 'Could not sign in to the lock' } };
