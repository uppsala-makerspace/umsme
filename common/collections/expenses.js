import { Mongo } from 'meteor/mongo';
import 'meteor/aldeed:collection2/static';
import { schemas } from '/imports/common/lib/schemas';

export const Expenses = new Mongo.Collection('expenses');
Expenses.attachSchema(schemas.expense);

// Expenses are never mutated directly from the client. Every state change
// (create, update, submit, abort, confirm, reject, reimburse) goes through a
// server method so the workflow rules, role checks, and the no-self-confirm
// rule are enforced in one place. Deny all direct client writes.
Expenses.deny({
  insert() { return true; },
  update() { return true; },
  remove() { return true; },
});
