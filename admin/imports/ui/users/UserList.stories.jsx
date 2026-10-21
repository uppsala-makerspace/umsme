import { fn } from 'storybook/test';
import { UserList } from './UserList';

const rows = [
  { _id: 'u1', username: 'admin', email: '', roles: ['admin'], createdAt: new Date(2020, 0, 1) },
  { _id: 'u2', username: 'board@example.org', email: 'board@example.org', roles: ['board'], createdAt: new Date(2024, 4, 2) },
  { _id: 'u3', username: '', email: 'member@example.org', roles: [], createdAt: new Date(2026, 8, 3) },
];

export default {
  title: 'Users/UserList',
  component: UserList,
  args: { rows, total: rows.length, loading: false, query: { page: 0, pageSize: 25, sort: null, search: '' }, onQueryChange: fn() },
};

export const Accounts = {};
export const Empty = { args: { rows: [], total: 0 } };
