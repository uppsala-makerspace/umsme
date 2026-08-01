/**
 * Who may review (approve or reject) an expense.
 *
 * Pure: takes plain objects, no Meteor, so the rules can be unit tested without
 * a database. The Meteor wiring (role lookup, fetching accounts) lives in
 * app/server/methods/utils.js.
 *
 * Note the deliberate split from *spending* rights: an account's `groupIds`
 * decide who may charge an expense to it (see expenseAccountsFor), while
 * `approverMemberIds` decides who may review one. Being in the owning group
 * grants no review rights at all.
 */

/** Roles that may review every expense, regardless of account. */
export const REVIEWER_ROLES = ["admin", "board", "treasurer"];

/**
 * The accounts whose expenses this member may review.
 *
 * @param {Array<object>} accounts  All expense accounts
 * @param {string} memberId
 * @param {boolean} hasReviewerRole  Holds admin/board/treasurer
 * @return {Array<string>} account ids
 */
export const approvableAccountIds = (accounts, memberId, hasReviewerRole) => {
  if (hasReviewerRole) return accounts.map((a) => a._id);
  if (!memberId) return [];
  return accounts
    .filter((a) => (a.approverMemberIds || []).includes(memberId))
    .map((a) => a._id);
};

/** Statuses a reviewer may look at: everything that has left the submitter's
 *  hands. A `pending` draft is the submitter's private working copy. */
const VISIBLE_TO_REVIEWER = ["submitted", "confirmed", "rejected", "reimbursed"];

/**
 * Whether this member may *read* this expense as a reviewer.
 *
 * Wider than canReviewExpense on purpose: having approved or rejected
 * something, the reviewer still needs to open it — to see the outcome, and to
 * re-read the reason they gave. Only acting on it is restricted to `submitted`.
 *
 * Says nothing about the submitter's own access, which is handled separately.
 *
 * @param {object} expense
 * @param {{memberId: string, accountIds: Array<string>}} reviewer
 * @return {boolean}
 */
export const canViewExpense = (expense, { memberId, accountIds = [] } = {}) => {
  if (!expense || !expense.expenseAccountId) return false;
  if (!VISIBLE_TO_REVIEWER.includes(expense.status)) return false;
  if (expense.memberId === memberId) return false;
  return accountIds.includes(expense.expenseAccountId);
};

/**
 * Whether this member may review this particular expense.
 *
 * Only submitted expenses are reviewable in the app, and never one's own — the
 * same no-self-review rule the admin app enforces. Correcting an already
 * confirmed expense stays an admin/treasurer task.
 *
 * @param {object} expense
 * @param {{memberId: string, accountIds: Array<string>}} reviewer
 * @return {boolean}
 */
export const canReviewExpense = (expense, { memberId, accountIds = [] } = {}) => {
  if (!expense || expense.status !== "submitted") return false;
  if (!expense.expenseAccountId) return false;
  if (expense.memberId === memberId) return false;
  return accountIds.includes(expense.expenseAccountId);
};
