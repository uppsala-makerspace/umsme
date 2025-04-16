import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import './UserList.html';
import '/lib/tabular/users';

Template.UserList.onCreated(() => {
  Meteor.subscribe('users');
});

Template.UserList.helpers({
});

Template.UserList.events({
  'click .userList tbody tr': function (event) {
    event.preventDefault();
    const dataTable = $(event.target).closest('table').DataTable();
    const rowData = dataTable.row(event.currentTarget).data();
    if (!rowData) return; // Won't be data if a placeholder row is clicked
    FlowRouter.go(`/admin/user/${rowData._id}`);
  },
});