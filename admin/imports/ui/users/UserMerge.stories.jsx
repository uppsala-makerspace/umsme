import { fn } from 'storybook/test';
import { UserMerge } from './UserMerge';

const member = (id, mid, name, email, memberships) => ({ _id: id, mid, name, email, memberships });
const plan = {
  kept: {
    _id: 'u1', emails: [{ address: 'anna@example.org', verified: true }], logins: ['password'], roles: [],
    member: { _id: 'm1', mid: '1201', name: 'Anna Andersson', email: 'anna@example.org' },
  },
  removed: {
    _id: 'u2', emails: [{ address: 'anna.old@example.org', verified: true }], logins: ['google'], roles: [],
    member: { _id: 'm2', mid: '1188', name: 'Anna Andersson', email: 'anna.old@example.org' },
  },
  emails: [{ address: 'anna@example.org', verified: true }, { address: 'anna.old@example.org', verified: true }],
  logins: ['password', 'google'],
  moves: [{ label: 'Sessions', count: 1 }, { label: 'Push subscriptions', count: 2 }],
  members: {
    keptMemberId: 'm2',
    plan: {
      source: member('m1', '1201', 'Anna Andersson', 'anna@example.org', []),
      dest: member('m2', '1188', 'Anna Andersson', 'anna.old@example.org', [{ _id: 'ms1', type: 'labandmember', start: '2026-03-01', end: '2027-03-01' }]),
      moves: [{ label: 'Event registrations', count: 1 }],
      copies: [{ field: 'mobile', label: 'Mobile', shown: '0701234567' }],
      blockers: [],
      warnings: [],
    },
  },
  blockers: [],
  warnings: ['Both accounts have a password. The kept account\'s stays; the other one\'s stops working.'],
};

export default {
  title: 'Users/UserMerge',
  component: UserMerge,
  args: { plan: null, done: null, onPreview: fn(), onMerge: fn(), onEdit: fn() },
};

export const Empty = {};
export const Preview = { args: { plan } };
export const Blocked = { args: { plan: { ...plan, blockers: ['Both accounts sign in with different google accounts.'] } } };
export const Done = { args: { done: plan } };
