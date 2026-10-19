import { fn } from 'storybook/test';
import { FindStatus } from './FindStatus';

export default {
  title: 'Check/FindStatus',
  component: FindStatus,
  args: { onFind: fn(), onMail: fn() },
};

export const Start = {};
export const WrongCombination = { args: { wrong: true } };
export const Mailed = { args: { mailedTo: 'maja@example.org' } };
