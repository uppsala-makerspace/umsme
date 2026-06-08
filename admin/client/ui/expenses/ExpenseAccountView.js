import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { ExpenseAccounts } from '/imports/common/collections/expenseAccounts';
import { Expenses } from '/imports/common/collections/expenses';
import './ExpenseAccountView.html';

Template.ExpenseAccountView.onCreated(function () {
  Meteor.subscribe('expenseAccounts');
  Meteor.subscribe('expenses');
});

Template.ExpenseAccountView.helpers({
  ExpenseAccounts() {
    return ExpenseAccounts;
  },
  account() {
    return ExpenseAccounts.findOne(FlowRouter.getParam('_id'));
  },
  isUsed() {
    return !!Expenses.findOne({ expenseAccountId: FlowRouter.getParam('_id') });
  },
});

Template.ExpenseAccountView.events({
  'click .deleteExpenseAccount': function () {
    const id = FlowRouter.getParam('_id');
    if (!confirm('Delete this expense account?')) return;
    ExpenseAccounts.remove(id, (err) => {
      if (err) {
        alert('Delete failed: ' + err.message);
        return;
      }
      FlowRouter.go('/expenses/accounts');
    });
  },
});

AutoForm.hooks({
  editExpenseAccountForm: {
    onSuccess: function () {
      FlowRouter.go('/expenses/accounts');
    },
  },
});
