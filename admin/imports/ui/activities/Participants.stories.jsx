import { fn } from 'storybook/test';
import { Participants } from './Participants';

const at = (d, h) => new Date(2026, 10, d, h, 0);
const registrations = [
  { _id: 'r1', memberId: 'm1', memberName: 'Alice Andersson', mid: '101', state: 'checkedIn', registeredAt: at(1, 10) },
  { _id: 'r2', memberId: 'm2', memberName: 'Bertil Berg', mid: '102', state: 'approved', registeredAt: at(2, 11), info: 'Vegetarian' },
  { _id: 'r3', memberId: 'm3', memberName: 'Cecilia Ceder', mid: '103', state: 'queued', registeredAt: at(3, 12) },
  { _id: 'r4', memberId: 'm4', memberName: 'David Dahl', mid: '104', state: 'withdrawn', registeredAt: at(1, 9) },
];

export default {
  title: 'Activities/Participants',
  component: Participants,
  args: {
    registrations, seats: 2, started: false, attendanceClosed: false, takesRegistrations: true, search: async () => [],
    onAdd: fn(), onWithdraw: fn(), onTakeSeat: fn(), onAttended: fn(), onCloseAttendance: fn(),
  },
};

export const BeforeTheStart = {};
export const SeatFree = { args: { seats: 3 } };
export const Attendance = { args: { started: true, registrations: registrations.map((r) => (r._id === 'r1' ? { ...r, state: 'attended' } : r)) } };
export const Closed = { args: { started: true, attendanceClosed: true, registrations: registrations.map((r) => ({ ...r, state: r.state === 'approved' ? 'noShow' : r.state })) } };
export const NoRegistration = { args: { takesRegistrations: false, registrations: [] } };
