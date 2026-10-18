/**
 * Filters for the expense lists in admin: the /expenses list (status and
 * expense date) and the "Reimbursed" view of /expenses/reimburse (payment date).
 *
 * Pure apart from the schema import, so the date boundaries can be tested
 * without a database.
 */
import { models } from '/imports/common/lib/models';

const DAY = 86400000;

export const EXPENSE_STATUSES = models.expense.status.allowedValues;

/**
 * Selector for `field` between two YYYY-MM-DD dates, both days included; a
 * missing date leaves that end open.
 *
 * Expense dates are stored as UTC midnight of the date picked (new
 * Date('YYYY-MM-DD')), so the range is read the same way: from midnight of
 * `from` up to, not including, the day after `to`.
 */
export const dateRangeSelector = (field, { from, to } = {}) => {
  const range = {};
  if (from) range.$gte = new Date(from);
  if (to) range.$lt = new Date(new Date(to).getTime() + DAY);
  return Object.keys(range).length ? { [field]: range } : {};
};

/** Expenses reimbursed, or set up for payment, within a range of payment dates. */
export const reimbursedSelector = (range = {}) => ({
  status: 'reimbursed',
  ...dateRangeSelector('reimbursedDate', range),
});

/** The /expenses list: everything unless a status or an expense date range is set. */
export const expenseListSelector = ({ status, from, to } = {}) => ({
  ...(status ? { status } : {}),
  ...dateRangeSelector('date', { from, to }),
});

/** The local calendar date of `now` as YYYY-MM-DD, the value of a date input. */
export const todayIso = (now = new Date()) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

/** Sum of the amounts; an expense without an amount counts as 0. */
export const sumAmounts = (expenses) =>
  expenses.reduce((total, e) => total + (typeof e.amount === 'number' ? e.amount : 0), 0);
