/**
 * The "Reimbursed" view of /expenses/reimburse: expenses paid out, or set up
 * for payment on a later date, within a range of payment dates.
 *
 * Pure, so the date boundaries can be tested without Meteor.
 */

const DAY = 86400000;

// reimbursedDate is stored as UTC midnight of the date the treasurer picked
// (expenses.reimburse does new Date('YYYY-MM-DD')), so the range is read the
// same way: from midnight of `from` up to, not including, the day after `to`.
export const reimbursedSelector = ({ from, to } = {}) => {
  const range = {};
  if (from) range.$gte = new Date(from);
  if (to) range.$lt = new Date(new Date(to).getTime() + DAY);
  return {
    status: 'reimbursed',
    ...(Object.keys(range).length ? { reimbursedDate: range } : {}),
  };
};

/** The local calendar date of `now` as YYYY-MM-DD, the value of a date input. */
export const todayIso = (now = new Date()) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

/** Sum of the amounts; an expense without an amount counts as 0. */
export const sumAmounts = (expenses) =>
  expenses.reduce((total, e) => total + (typeof e.amount === 'number' ? e.amount : 0), 0);
