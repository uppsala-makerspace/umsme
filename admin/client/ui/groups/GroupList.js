import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import '/imports/tabular/groups';

import './GroupList.html';

Template.GroupList.onCreated(function () {
  Meteor.subscribe('groups');
});

Template.GroupList.events({
  'click .groupList tbody tr': function (event) {
    event.preventDefault();
    const dataTable = $(event.target).closest('table').DataTable();
    const rowData = dataTable.row(event.currentTarget).data();
    if (!rowData) return;
    FlowRouter.go(`/group/${rowData._id}`);
  },
});
