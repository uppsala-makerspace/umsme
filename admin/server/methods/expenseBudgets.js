import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/roles';
import { check, Match } from 'meteor/check';
import { ExpenseAccounts } from '/imports/common/collections/expenseAccounts';
import { ExpenseBudgets } from '/imports/common/collections/expenseBudgets';
import { memberForUser } from '/imports/common/server/memberForUser';

const BUDGET_ROLES = ['admin', 'board', 'treasurer'];

const requireRole = async (roles) => {
  if (!Meteor.userId() || !(await Roles.userIsInRoleAsync(Meteor.userId(), roles))) {
    throw new Meteor.Error('not-authorized', 'Insufficient role');
  }
};

Meteor.methods({
  /**
   * Set or revise an expense account's budget for a calendar year. Adds a new
   * revision; earlier ones stay as history. The first revision of a year may
   * go without a comment, every later one must say why the budget changed.
   */
  'expenseBudgets.add': async ({ expenseAccountId, year, amount, setAt, comment }) => {
    await requireRole(BUDGET_ROLES);
    check(expenseAccountId, String);
    check(year, Match.Integer);
    check(amount, Number);
    check(setAt, Date);
    check(comment, Match.Maybe(String));

    if (!(await ExpenseAccounts.findOneAsync(expenseAccountId))) {
      throw new Meteor.Error('not-found', 'Expense account not found');
    }
    if (!Number.isFinite(amount) || amount < 0) {
      throw new Meteor.Error('bad-amount', 'The budget must be zero or more');
    }
    const text = (comment || '').trim();
    const isRevision = !!(await ExpenseBudgets.findOneAsync({ expenseAccountId, year }));
    if (isRevision && !text) {
      throw new Meteor.Error('comment-required', 'A revision needs a comment explaining the change');
    }

    // setBy is optional in the schema: leave it out for actors without a
    // member record (e.g. the bare `admin` login) rather than storing null.
    const me = (await memberForUser(await Meteor.userAsync()))?._id;
    return ExpenseBudgets.insertAsync({
      expenseAccountId,
      year,
      amount,
      setAt,
      ...(text ? { comment: text } : {}),
      ...(me ? { setBy: me } : {}),
      createdAt: new Date(),
    });
  },

  /**
   * Remove one budget entry, for correcting a mistake. If it was the budget in
   * force, the previous entry for the year takes over again; if it was the
   * only one, the year has no budget.
   */
  'expenseBudgets.remove': async (budgetId) => {
    await requireRole(BUDGET_ROLES);
    check(budgetId, String);
    const removed = await ExpenseBudgets.removeAsync(budgetId);
    if (!removed) throw new Meteor.Error('not-found', 'Budget entry not found');
    return true;
  },
});
