import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { ExpenseAccounts } from '/imports/common/collections/expenseAccounts';
import './ExpenseAccountAdd.html';
import { readDimensionInputs } from './ExpenseAccountDimensions';

Template.ExpenseAccountAdd.onCreated(function () {
  Meteor.subscribe('expenseAccounts');
});

Template.ExpenseAccountAdd.helpers({
  ExpenseAccounts() {
    return ExpenseAccounts;
  },
});

AutoForm.hooks({
  insertExpenseAccountForm: {
    onSubmit: function (doc) {
      doc.createdAt = new Date();
      const dims = readDimensionInputs();
      if (Object.keys(dims).length) doc.dimensions = dims;
      ExpenseAccounts.insert(doc);
      this.done();
      FlowRouter.go('/expenses/accounts');
      return false;
    },
  },
});
