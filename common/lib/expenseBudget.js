/**
 * Budget rules for expense accounts.
 *
 * Pure: plain objects in, plain values out, no Meteor — so they can be unit
 * tested without a database and shared by the admin and member apps.
 *
 * A budget is set per account and calendar year, and revised by adding a new
 * revision rather than editing the old one. The revision in force is the one
 * with the latest `setAt`; `createdAt` breaks ties when two share a date.
 * An expense belongs to the year of its receipt `date`.
 */

/**
 * The statuses that can count as spent, in workflow order. The member app lets
 * the viewer pick any of them; confirmed and reimbursed are on by default.
 * Rejected expenses and drafts never count.
 */
export const BUDGET_SPENT_STATUSES = ["submitted", "confirmed", "reimbursed"];

export const DEFAULT_BUDGET_SPENT_STATUSES = ["confirmed", "reimbursed"];

const time = (d) => (d ? new Date(d).getTime() : 0);

/**
 * Revisions newest first: the one in force leads, the history follows.
 *
 * @param {Array<object>} revisions  Revisions for one account and year
 * @return {Array<object>}
 */
export const sortRevisions = (revisions = []) =>
  [...revisions].sort(
    (a, b) => time(b.setAt) - time(a.setAt) || time(b.createdAt) - time(a.createdAt)
  );

/**
 * The revision in force, or null when no budget has been set.
 *
 * @param {Array<object>} revisions  Revisions for one account and year
 * @return {object|null}
 */
export const currentBudget = (revisions = []) => sortRevisions(revisions)[0] || null;

/**
 * What has been spent, counting the chosen statuses. Anything outside
 * BUDGET_SPENT_STATUSES is ignored, so a rejected expense can never count.
 *
 * @param {Object<string, number>} totalsByStatus  e.g. { submitted: 120, confirmed: 800 }
 * @param {Array<string>} statuses  Statuses to count; defaults to confirmed and reimbursed
 * @return {number}
 */
export const spentFor = (totalsByStatus = {}, statuses = DEFAULT_BUDGET_SPENT_STATUSES) =>
  statuses
    .filter((status) => BUDGET_SPENT_STATUSES.includes(status))
    .reduce((sum, status) => sum + (Number(totalsByStatus[status]) || 0), 0);

/**
 * What is left of the budget. Negative when it is overspent; null when there
 * is no budget to be left of.
 *
 * @param {number|null|undefined} budget
 * @param {number} spent
 * @return {number|null}
 */
export const remaining = (budget, spent) =>
  budget === null || budget === undefined ? null : budget - spent;
