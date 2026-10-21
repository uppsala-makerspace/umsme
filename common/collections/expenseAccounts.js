import { Mongo } from 'meteor/mongo';
import 'meteor/aldeed:collection2/static';
import { schemas } from '/imports/common/lib/schemas';

export const ExpenseAccounts = new Mongo.Collection('expenseAccounts');
ExpenseAccounts.attachSchema(schemas.expenseAccount);
// No allow rules: admin writes through the expenseAccounts.* methods
// (common/server/expenses/accounts.js), which keep the approvers within the
// account's groups and an account in use from being removed.
