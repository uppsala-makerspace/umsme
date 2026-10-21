import { fn } from 'storybook/test';
import { ExpenseList } from './ExpenseList';
import { storyList } from './fixtures';

export default {
  title: 'Expenses/ExpenseList',
  component: ExpenseList,
  args: { title: 'Expenses', list: storyList(), filters: { status: '', from: '', to: '' }, onFilter: fn(), onClearFilters: fn() },
};

export const All = {};
export const Filtered = { args: { filters: { status: 'submitted', from: '2026-09-01', to: '' } } };
export const ConfirmQueue = { args: { title: 'Expenses to confirm', filters: undefined } };
