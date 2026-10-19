import { fn } from 'storybook/test';
import { MemberCertificates } from './MemberCertificates';

const people = [{ _id: 'm1', name: 'Sara Styrgrupp', mid: '1002' }, { _id: 'm3', name: 'Astrid Admin', mid: '1001' }];
const attestations = [
  { _id: 'a1', certificateId: 'c2', certificateName: 'Keramikugn', certifierId: 'm1', certifierName: 'Sara Styrgrupp', startDate: new Date(2026, 8, 20), endDate: new Date(2027, 8, 20), pending: false },
  { _id: 'a2', certificateId: 'c1', certificateName: 'Introduktion', certifierId: '__system__', certifierName: 'System (test)', startDate: new Date(2025, 2, 1), endDate: null, pending: false },
];

export default {
  title: 'Certificates/MemberCertificates',
  component: MemberCertificates,
  args: {
    attestations,
    certificates: [{ value: 'c1', label: 'Introduktion' }, { value: 'c2', label: 'Keramikugn', validityDays: 365 }, { value: 'c3', label: 'Drejskiva' }],
    search: async (q) => people.filter((p) => p.name.toLowerCase().includes(q.toLowerCase())),
    defaultCertifier: people[1],
    attempts: [{ certificateId: 'c1', certificateName: 'Introduktion', testId: 'safety', count: 2, lastState: 'passed' }],
    onGrant: fn(async () => true), onRevoke: fn(), onResetAttempts: fn(),
  },
};

export const Member = {};
export const NoCertificates = { args: { attestations: [], attempts: [] } };
export const Loading = { args: { attestations: null } };
