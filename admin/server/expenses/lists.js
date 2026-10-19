import { Meteor } from 'meteor/meteor';
import { Expenses } from '/imports/common/collections/expenses';
import { ExpenseAccounts } from '/imports/common/collections/expenseAccounts';
import { Members } from '/imports/common/collections/members';
import { expenseListSelector, reimbursedSelector, sumAmounts } from '/imports/expenses/expenseFilters';

/**
 * The expense lists of admin, worked out on the server with the members' and
 * accounts' names filled in: the list and its work queues paged, the
 * reimbursed view with its total, and one expense with what paying it needs.
 */

const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const EXPENSE_SORTS = ['date', 'dueDate', 'amount', 'status', 'type', 'place', 'reimbursedDate', 'submittedAt'];

/** The work queues: what each view holds, and its order unless sorted otherwise. */
const VIEWS = {
  all: { selector: (filters) => expenseListSelector(filters), order: { date: -1 } },
  confirm: { selector: () => ({ status: 'submitted' }), order: { date: -1 } },
  receipts: { selector: () => ({ status: 'confirmed', type: { $ne: 'invoice' } }), order: { date: -1 } },
  invoices: { selector: () => ({ status: 'confirmed', type: 'invoice' }), order: { dueDate: 1 } },
};

const names = async (expenses) => {
  const members = await Members.find({ _id: { $in: expenses.map((e) => e.memberId) } }, { fields: { name: 1 } }).fetchAsync();
  const accounts = await ExpenseAccounts.find({ _id: { $in: expenses.map((e) => e.expenseAccountId).filter(Boolean) } }, { fields: { name: 1 } }).fetchAsync();
  const member = Object.fromEntries(members.map((m) => [m._id, m.name]));
  const account = Object.fromEntries(accounts.map((a) => [a._id, a.name]));
  return expenses.map((e) => ({ ...e, memberName: member[e.memberId] || e.memberId, accountName: e.expenseAccountId ? account[e.expenseAccountId] || '' : '' }));
};

const searchSelector = async (search) => {
  const words = (search || '').trim().split(/\s+/).filter(Boolean).slice(0, 5);
  if (!words.length) return null;
  const parts = [];
  for (const word of words) {
    const pattern = new RegExp(escape(word), 'i');
    const members = await Members.find({ name: pattern }, { fields: { _id: 1 }, limit: 200 }).fetchAsync();
    const accounts = await ExpenseAccounts.find({ name: pattern }, { fields: { _id: 1 } }).fetchAsync();
    parts.push({ $or: [
      { place: pattern }, { note: pattern }, { status: pattern },
      { memberId: { $in: members.map((m) => m._id) } }, { expenseAccountId: { $in: accounts.map((a) => a._id) } },
    ] });
  }
  return { $and: parts };
};

const LIST_FIELDS = { memberId: 1, type: 1, date: 1, dueDate: 1, amount: 1, expenseAccountId: 1, place: 1, status: 1, reimbursedDate: 1, submittedAt: 1 };

/**
 * One page of a view, with the names.
 *
 * @param {{ view: 'all'|'confirm'|'receipts'|'invoices', filters?: { status, from, to }, search?: string,
 *           sort?: { field, direction }, page?: number, pageSize?: number }} options
 * @returns {Promise<{ rows: object[], total: number }>}
 */
export const expensesPage = async ({ view, filters = {}, search, sort, page = 0, pageSize = 25 }) => {
  const shape = VIEWS[view];
  if (!shape) throw new Meteor.Error('bad-view', `No expense list "${view}"`);
  if (sort && !EXPENSE_SORTS.includes(sort.field)) throw new Meteor.Error('bad-sort', `Cannot sort by "${sort.field}"`);
  const size = Math.min(Math.max(1, pageSize), 200);
  const found = await searchSelector(search);
  const base = shape.selector(filters);
  const selector = found ? { $and: [base, found] } : base;
  const order = { ...(sort ? { [sort.field]: sort.direction === 'desc' ? -1 : 1 } : shape.order), _id: 1 };
  const [expenses, total] = await Promise.all([
    Expenses.find(selector, { fields: LIST_FIELDS, sort: order, skip: Math.max(0, page) * size, limit: size }).fetchAsync(),
    Expenses.find(selector).countAsync(),
  ]);
  return { rows: await names(expenses), total };
};

/** What was reimbursed or paid in a range of payment dates, oldest first, and the sum. */
export const reimbursedList = async (range) => {
  const expenses = await Expenses.find(reimbursedSelector(range), { fields: LIST_FIELDS, sort: { reimbursedDate: 1, date: 1 } }).fetchAsync();
  return { rows: await names(expenses), total: sumAmounts(expenses) };
};

/**
 * What the expense's page shows besides the expense: who submitted it and
 * where to pay them, who rejected it, and the account with its object codes.
 */
export const expensePayee = async (expenseId) => {
  const expense = await Expenses.findOneAsync(expenseId, { fields: { memberId: 1, expenseAccountId: 1, rejectedBy: 1 } });
  if (!expense) throw new Meteor.Error('not-found', 'Expense not found');
  const member = await Members.findOneAsync(expense.memberId, { fields: { name: 1, bankName: 1, bankClearing: 1, bankAccountNumber: 1, bankAccountHolder: 1 } });
  const account = expense.expenseAccountId ? await ExpenseAccounts.findOneAsync(expense.expenseAccountId, { fields: { name: 1, dimensions: 1 } }) : null;
  const rejectedBy = expense.rejectedBy ? await Members.findOneAsync(expense.rejectedBy, { fields: { name: 1 } }) : null;
  const clearing = (member?.bankClearing || '').trim();
  const number = (member?.bankAccountNumber || '').trim();
  return {
    memberName: member?.name || expense.memberId,
    // A plain concatenation for convenience; the treasurer's bank validates
    // and pads (account numbers carry check digits).
    bank: clearing || number ? {
      name: (member.bankName || '').trim(), holder: (member.bankAccountHolder || '').trim(),
      clearing: clearing || '—', number: number || '—', combined: `${clearing.replace(/\D/g, '')}${number.replace(/\D/g, '')}`,
    } : null,
    rejectedByName: rejectedBy?.name || expense.rejectedBy || null,
    accountName: account?.name || null,
    accountDimensions: account?.dimensions ? Object.keys(account.dimensions).sort().map((nr) => `${nr}:${account.dimensions[nr]}`).join(', ') : '',
  };
};
