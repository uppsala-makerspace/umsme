import { fn } from 'storybook/test';
import { MessageView } from './MessageView';

export default {
  title: 'Messages/MessageView',
  component: MessageView,
  args: {
    memberName: 'Ulla Utesluten', onDelete: fn(),
    message: { _id: 'm1', member: 'u1', type: 'status', to: 'excluded@example.org', subject: 'Ditt medlemskap', messagetext: 'Hej Ulla!\n\nHär är din status.', senddate: new Date(2026, 9, 10, 9, 0) },
  },
};

export const Message = {};
