import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { ExpenseAccounts } from '/imports/common/collections/expenseAccounts';
import './ExpenseAccountAdd.html';

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
      ExpenseAccounts.insert(doc);
      this.done();
      FlowRouter.go('/expenses/accounts');
      return false;
    },
  },
});
