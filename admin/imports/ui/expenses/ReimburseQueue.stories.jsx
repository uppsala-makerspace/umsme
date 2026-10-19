import { fn } from 'storybook/test';
import { ReimburseQueue } from './ReimburseQueue';
import { storyList, storyExpenses } from './fixtures';

export default {
  title: 'Expenses/ReimburseQueue',
  component: ReimburseQueue,
  args: {
    view: 'queue', onViewChange: fn(), invoices: storyList([storyExpenses[1]]), receipts: storyList([storyExpenses[0]]),
    range: { from: '2026-10-01', to: '' }, onRangeChange: fn(), onOpen: fn(),
  },
};

export const Queue = {};
export const Reimbursed = { args: { view: 'reimbursed', reimbursed: { rows: [storyExpenses[2]], total: 89.5 } } };
