import { ExpenseAccountList } from './ExpenseAccountList';
import { storyAccount, storyGroups } from './fixtures';

export default {
  title: 'Expenses/ExpenseAccountList',
  component: ExpenseAccountList,
  args: { loading: false, accounts: [storyAccount, { _id: 'a2', name: 'Trä', explanation: 'Virke och verktyg.', groupIds: [] }], groupName: (id) => storyGroups.find((g) => g._id === id)?.name.sv },
};

export const Accounts = {};
export const ForTheTreasurer = { args: { canAdd: false } };
