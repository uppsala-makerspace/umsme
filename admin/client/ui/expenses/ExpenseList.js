import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import '/imports/tabular/expenses';

import './ExpenseList.html';

// Work-queue views keyed by route name: filter the Expenses table by status.
const MODES = {
  expensesConfirm: { status: 'submitted', heading: 'Expenses to confirm' },
  expensesReimburse: { status: 'confirmed', heading: 'Expenses to reimburse' },
};

Template.ExpenseList.onCreated(function () {
  Meteor.subscribe('expenses');
  Meteor.subscribe('expenseAccounts');
  Meteor.subscribe('members');
});

Template.ExpenseList.helpers({
  heading() {
    return MODES[FlowRouter.getRouteName()]?.heading || 'Expenses';
  },
  selector() {
    const mode = MODES[FlowRouter.getRouteName()];
    return mode ? { status: mode.status } : {};
  },
});

Template.ExpenseList.events({
  'click .expenseList tbody tr': function (event) {
    event.preventDefault();
    const dataTable = $(event.target).closest('table').DataTable();
    const rowData = dataTable.row(event.currentTarget).data();
    if (!rowData) return;
    FlowRouter.go(`/expense/${rowData._id}`);
  },
});
