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
 * Which expense statuses count as spent, per way of counting. The member app
 * lets the viewer switch between them; `approved` is the default.
 */
export const BUDGET_SPENT_MODES = {
  approved: ["confirmed", "reimbursed"],
  claimed: ["submitted", "confirmed", "reimbursed"],
  paid: ["reimbursed"],
};

export const DEFAULT_BUDGET_SPENT_MODE = "approved";

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
 * What has been spent under a given way of counting.
 *
 * @param {Object<string, number>} totalsByStatus  e.g. { submitted: 120, confirmed: 800 }
 * @param {string} mode  A key of BUDGET_SPENT_MODES; unknown falls back to the default
 * @return {number}
 */
export const spentFor = (totalsByStatus = {}, mode = DEFAULT_BUDGET_SPENT_MODE) => {
  const statuses = BUDGET_SPENT_MODES[mode] || BUDGET_SPENT_MODES[DEFAULT_BUDGET_SPENT_MODE];
  return statuses.reduce((sum, status) => sum + (Number(totalsByStatus[status]) || 0), 0);
};

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
