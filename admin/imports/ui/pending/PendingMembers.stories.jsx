import { fn } from 'storybook/test';
import { PendingMembers } from './PendingMembers';

const DAY = 86400000;
export default {
  title: 'Members/PendingMembers',
  component: PendingMembers,
  args: {
    onAccept: fn(),
    members: [
      { _id: 'p1', name: 'Petra Väntande', email: 'pending@example.org', member: new Date(Date.now() + 300 * DAY), totalPaid: 200, userId: 'u1', reminderState: 'none' },
      { _id: 'p2', name: 'Fredrik Familj', email: 'family@example.org', member: new Date(Date.now() + 10 * DAY), lab: new Date(Date.now() + 10 * DAY), family: true, totalPaid: 2000, reminderState: 'needed' },
    ],
  },
};

export const Pending = {};
export const NobodyWaiting = { args: { members: [] } };
export const Accepted = { args: { notice: 'Petra Väntande is accepted and welcomed.' } };
