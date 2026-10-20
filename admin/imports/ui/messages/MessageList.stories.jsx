import { MessageList } from './MessageList';

export default {
  title: 'Messages/MessageList',
  component: MessageList,
  args: {
    loading: false,
    messages: [
      { _id: 'm1', type: 'welcome', subject: 'Välkommen till Uppsala Makerspace', senddate: new Date(2026, 8, 1, 10, 12) },
      { _id: 'm2', type: 'reminder', subject: 'Ditt medlemskap går snart ut', senddate: new Date(2026, 9, 10, 9, 0) },
    ],
  },
};

export const Messages = {};
export const None = { args: { messages: [] } };
