import React, { useState } from 'react';
import Button from '@mui/material/Button';
import { MemberList } from './MemberList';

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();
const rows = [
  { _id: 'm1', mid: '104', name: 'Ella Utgående', email: 'expiring@example.org', mobile: '+46 (0)70 123 45 67', member: new Date(now + 10 * DAY), liability: true, reminderState: 'needed' },
  { _id: 'm2', mid: '120', name: 'Fredrik Familj', email: 'family@example.org', family: true, member: new Date(now + 5 * DAY), lab: new Date(now + 5 * DAY), lock: 'x', reminder: new Date(now - 2 * DAY), reminderState: 'done' },
  { _id: 'm3', mid: '121', name: 'Frida Familj', email: 'family-member@example.org', family: true, infamily: 'm2', member: new Date(now + 5 * DAY), reminderState: null },
  { _id: 'm4', mid: '98', name: 'Erik Utgången', email: 'expired@example.org', member: new Date(now - 4 * DAY), storage: '1012', reminderState: 'overdue' },
];

/** Keeps the query, as useServerList does, without a server. */
const Paged = (props) => {
  const [query, setQuery] = useState({ page: 0, pageSize: 25, sort: null, search: '' });
  return <MemberList {...props} query={query} onQueryChange={setQuery} />;
};

export default {
  title: 'Members/MemberList',
  component: MemberList,
  render: (args) => <Paged {...args} />,
  args: { title: 'Reminders', note: 'Members whose membership or lab ends within 21 days, or ended in the last 14.', rows, total: rows.length, loading: false },
};

export const Reminders = { args: { actions: <Button variant="outlined">Run reminder job now</Button> } };
export const Loading = { args: { rows: [], total: 0, loading: true } };
export const Empty = { args: { title: 'Excluded members', note: null, rows: [], total: 0, empty: 'Nobody is excluded.' } };
export const Refused = { args: { rows: [], total: 0, error: 'You do not have access to this' } };
