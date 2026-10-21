import { MemberStatus } from './MemberStatus';

const now = new Date(2026, 9, 20);

export default {
  title: 'Check/MemberStatus',
  component: MemberStatus,
  args: { now, searchPath: '../check' },
};

export const LabMember = { args: { status: { member: true, info: { name: 'Maja Medlem', id: '105', member: '2027-08-25', lab: '2027-08-25', storage: '1001' } } } };
export const MemberWithoutLab = { args: { status: { member: true, info: { name: 'Bo Basmedlem', id: '106', member: '2027-07-12', lab: '2025-02-01' } } } };
export const Ended = { args: { status: { member: true, info: { name: 'Erik Utgången', id: '110', member: '2026-03-01', lab: '2026-03-01' } } } };
export const NoSuchMember = { args: { status: { member: false, info: {} } } };
