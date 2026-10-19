import { Meteor } from 'meteor/meteor';
import { useTracker } from 'meteor/react-meteor-data';
import { Expenses } from '/imports/common/collections/expenses';
import { ExpenseAccounts } from '/imports/common/collections/expenseAccounts';
import { ExpenseBudgets } from '/imports/common/collections/expenseBudgets';

/**
 * Data for the expense pages: the narrow publications and the methods. The
 * pages' containers use this; the pure components never do.
 */

/** A page of a view: 'all', 'confirm', 'receipts' or 'invoices'. */
export const expensePage = (view, filters) => ({ page, pageSize, sort, search }) =>
  Meteor.callAsync('expenses.page', { view, filters, page, pageSize, sort, search });

export const reimbursedExpenses = (range) => Meteor.callAsync('expenses.reimbursed', range);

export const useExpense = (docId) => useTracker(() => {
  const handle = Meteor.subscribe('admin.expenses.expense', docId);
  return { loading: !handle.ready(), expense: Expenses.findOne(docId) };
}, [docId]);

export const expensePayee = (docId) => Meteor.callAsync('expenses.payee', docId);
export const receiptUrl = (docId) => Meteor.callAsync('expenses.adminGetReceiptUrl', docId).then((res) => res?.url || null);
export const accountingConfig = () => Meteor.callAsync('accounting.config');
export const confirmExpense = (docId) => Meteor.callAsync('expenses.confirm', docId);
export const unconfirmExpense = (docId) => Meteor.callAsync('expenses.unconfirm', docId);
export const rejectExpense = (docId, reason) => Meteor.callAsync('expenses.reject', docId, reason);
/** The day picked is a local calendar date. */
export const reimburseExpense = (docId, account, day) => Meteor.callAsync('expenses.reimburse', docId, account, new Date(`${day}T00:00:00`));
export const unreimburseExpense = (docId) => Meteor.callAsync('expenses.unreimburse', docId);

const ACCOUNT_FIELDS = { name: 1, explanation: 1, groupIds: 1, approverMemberIds: 1, approverGroupIds: 1, dimensions: 1 };

export const useExpenseAccounts = () => useTracker(() => {
  const handle = Meteor.subscribe('admin.expenseAccounts.list');
  return { loading: !handle.ready(), accounts: ExpenseAccounts.find({}, { fields: ACCOUNT_FIELDS, sort: { name: 1 } }).fetch() };
}, []);

/** One whole account and its budgets; no account without an id. */
export const useExpenseAccount = (docId) => useTracker(() => {
  const list = Meteor.subscribe('admin.expenseAccounts.list');
  if (!docId) return { loading: !list.ready(), account: null, budgets: [], accounts: ExpenseAccounts.find({}, { fields: ACCOUNT_FIELDS }).fetch() };
  const one = Meteor.subscribe('admin.expenseAccounts.account', docId);
  const budgets = Meteor.subscribe('admin.expenseBudgets.ofAccount', docId);
  return {
    loading: !list.ready() || !one.ready() || !budgets.ready(),
    account: ExpenseAccounts.findOne(docId),
    budgets: ExpenseBudgets.find({ expenseAccountId: docId }).fetch(),
    accounts: ExpenseAccounts.find({}, { fields: ACCOUNT_FIELDS }).fetch(),
  };
}, [docId]);

/** The form's values for an account, or empty ones for a new one. */
export const accountValues = (account) => ({
  name: account?.name || '',
  explanation: account?.explanation || '',
  dimensions: { ...(account?.dimensions || {}) },
  groupIds: account?.groupIds || [],
  approverMemberIds: account?.approverMemberIds || [],
  approverGroupIds: account?.approverGroupIds || [],
});

export const saveExpenseAccount = (values, account) => (account
  ? Meteor.callAsync('expenseAccounts.update', account._id, values, account.updatedAt ?? null)
  : Meteor.callAsync('expenseAccounts.create', values));
export const removeExpenseAccount = (docId) => Meteor.callAsync('expenseAccounts.remove', docId);
export const expenseAccountUse = (docId) => Meteor.callAsync('expenseAccounts.use', docId);
export const approverChoices = (groupIds, approverGroupIds) => Meteor.callAsync('expenseAccounts.approverChoices', groupIds, approverGroupIds);
/** Set or revise a budget; the day as a local date, read at noon so it cannot slip a day. */
export const addBudget = ({ accountId, year, amount, day, comment }) => Meteor.callAsync('expenseBudgets.add', {
  expenseAccountId: accountId, year, amount: Number(amount), setAt: new Date(`${day}T12:00:00`), comment,
});
export const removeBudget = (budgetId) => Meteor.callAsync('expenseBudgets.remove', budgetId);
