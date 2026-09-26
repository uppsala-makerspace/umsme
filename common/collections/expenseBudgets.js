import { Mongo } from 'meteor/mongo';
import 'meteor/aldeed:collection2/static';
import { schemas } from '/imports/common/lib/schemas';

export const ExpenseBudgets = new Mongo.Collection('expenseBudgets');
ExpenseBudgets.attachSchema(schemas.expenseBudget);

// Budget revisions are only written by the expenseBudgets.add and .remove
// methods in admin, which check the role (admin/board/treasurer) and record
// who set a budget. Direct client writes are denied outright.
ExpenseBudgets.deny({
  insert() { return true; },
  update() { return true; },
  remove() { return true; },
});
