import { fn } from 'storybook/test';
import { MessageActions } from './MessageActions';

export default {
  title: 'Messages/MessageActions',
  component: MessageActions,
  args: { kind: 'member', onSend: fn(), onMarkReminded: fn() },
};

export const ForAMember = {};
export const ForAMembership = { args: { kind: 'membership' } };
export const NotDue = { args: { error: 'Neither lab or regular membership is due in the next two weeks, no need to send reminder.' } };
