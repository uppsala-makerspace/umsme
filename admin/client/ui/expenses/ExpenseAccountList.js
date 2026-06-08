import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import '/imports/tabular/expenseAccounts';

import './ExpenseAccountList.html';

Template.ExpenseAccountList.onCreated(function () {
  Meteor.subscribe('expenseAccounts');
});

Template.ExpenseAccountList.events({
  'click .expenseAccountList tbody tr': function (event) {
    event.preventDefault();
    const dataTable = $(event.target).closest('table').DataTable();
    const rowData = dataTable.row(event.currentTarget).data();
    if (!rowData) return;
    FlowRouter.go(`/expenseaccount/${rowData._id}`);
  },
});
