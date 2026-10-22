import React from 'react';
import { fn } from 'storybook/test';
import { AdminConsole } from './AdminConsole';
import { MemberMerge } from './MemberMerge';

const member = (mid, name, memberships) => ({ _id: `m${mid}`, mid, name, email: `${mid}@example.org`, memberships });
const plan = {
  source: member('915', 'Anna Dubblett', [{ _id: 'ms1', type: 'member', start: '2025-01-10', end: '2026-01-10' }]),
  dest: member('120', 'Anna Andersson', []),
  moves: [{ label: 'Memberships', count: 1 }, { label: 'Payments', count: 2 }],
  copies: [{ label: 'Mobile', shown: '0701234567' }],
  blockers: [], warnings: ['Both members have an RFID tag; the destination keeps its own.'],
};
const mergeOn = { onPreview: fn(), onMerge: fn(), onEdit: fn() };

export default {
  title: 'Console/AdminConsole',
  component: AdminConsole,
  args: { mandatory: { name: 'Säkerhetsintroduktion', count: 12 }, on: { syncLock: fn(), grantMandatory: fn(), migrateUnlocks: fn(), updateDates: fn() }, merge: <MemberMerge plan={null} done={null} {...mergeOn} /> },
};

export const Start = {};
export const MergePreview = { args: { merge: <MemberMerge plan={plan} done={null} {...mergeOn} /> } };
export const Blocked = { args: { merge: <MemberMerge plan={{ ...plan, blockers: ['The source member pays for a family.'] }} done={null} {...mergeOn} /> } };
export const Done = {
  args: {
    merge: <MemberMerge plan={null} done={plan} {...mergeOn} />,
    results: { syncLock: { severity: 'success', text: '3 låsöppningar från 2026-10-19 till 2026-10-20\n\n2026-10-19T18:02:11.000Z outerDoor m1' } },
  },
};
export const NoMandatory = { args: { mandatory: null } };
