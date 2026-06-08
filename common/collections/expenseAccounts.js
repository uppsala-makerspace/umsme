import { Mongo } from 'meteor/mongo';
import 'meteor/aldeed:collection2/static';
import { schemas } from '/imports/common/lib/schemas';
import { allow } from './allow';
import { Expenses } from './expenses';

export const ExpenseAccounts = new Mongo.Collection('expenseAccounts');
ExpenseAccounts.attachSchema(schemas.expenseAccount);
allow(ExpenseAccounts);

// An account that has been used by any expense must not be removable.
ExpenseAccounts.deny({
  async remove(userId, doc) {
    const used = await Expenses.findOneAsync({ expenseAccountId: doc._id });
    return !!used;
  },
});
