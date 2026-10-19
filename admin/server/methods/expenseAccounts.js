import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { requireRole, DOMAIN_ROLES } from '/imports/common/server/authz';
import {
  createExpenseAccount, updateExpenseAccount, removeExpenseAccount, expenseAccountUse, approverChoices,
} from '/imports/common/server/expenses/accounts';

const AccountFields = {
  name: String,
  explanation: String,
  dimensions: Match.Optional(Match.OneOf(null, Object)),
  groupIds: Match.Optional([String]),
  approverMemberIds: Match.Optional([String]),
  approverGroupIds: Match.Optional([String]),
};

Meteor.methods({
  async 'expenseAccounts.create'(fields) {
    check(fields, AccountFields);
    await requireRole(this.userId, DOMAIN_ROLES.expenseAccounts);
    return createExpenseAccount(fields, { userId: this.userId });
  },

  async 'expenseAccounts.update'(docId, fields, expectedUpdatedAt) {
    check(docId, String);
    check(fields, AccountFields);
    check(expectedUpdatedAt, Match.OneOf(null, Date));
    await requireRole(this.userId, DOMAIN_ROLES.expenseAccounts);
    await updateExpenseAccount(docId, fields, { userId: this.userId, expectedUpdatedAt });
  },

  async 'expenseAccounts.remove'(docId) {
    check(docId, String);
    await requireRole(this.userId, DOMAIN_ROLES.expenseAccounts);
    await removeExpenseAccount(docId, { userId: this.userId });
  },

  /** How many expenses and budgets keep the account. */
  async 'expenseAccounts.use'(docId) {
    check(docId, String);
    await requireRole(this.userId, DOMAIN_ROLES.expenses);
    return expenseAccountUse(docId);
  },

  /** Who could approve with these groups, and how many active members the approver groups have. */
  async 'expenseAccounts.approverChoices'(groupIds, approverGroupIds) {
    check(groupIds, [String]);
    check(approverGroupIds, [String]);
    await requireRole(this.userId, DOMAIN_ROLES.expenses);
    return approverChoices(groupIds, approverGroupIds);
  },
});
