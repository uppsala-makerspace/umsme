import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { ExpenseAccounts } from '/imports/common/collections/expenseAccounts';
import { Groups } from '/imports/common/collections/groups';
import './ExpenseAccountAdd.html';
import { readDimensionInputs } from './ExpenseAccountDimensions';

Template.ExpenseAccountAdd.onCreated(function () {
  Meteor.subscribe('expenseAccounts');
  Meteor.subscribe('groups');
});

Template.ExpenseAccountAdd.helpers({
  ExpenseAccounts() {
    return ExpenseAccounts;
  },
  allGroups() {
    return Groups.find({}, { sort: { 'name.sv': 1 } });
  },
});

AutoForm.hooks({
  insertExpenseAccountForm: {
    onSubmit: function (doc) {
      doc.createdAt = new Date();
      const dims = readDimensionInputs();
      if (Object.keys(dims).length) doc.dimensions = dims;
      const group = document.querySelector('.expenseAccountGroupSelect')?.value;
      if (group) doc.groupId = group;
      ExpenseAccounts.insert(doc);
      this.done();
      FlowRouter.go('/expenses/accounts');
      return false;
    },
  },
});
