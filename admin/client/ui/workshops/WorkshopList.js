import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import '/imports/tabular/workshops';

import './WorkshopList.html';

Template.WorkshopList.onCreated(function () {
  Meteor.subscribe('workshops');
});

Template.WorkshopList.events({
  'click .workshopList tbody tr': function (event) {
    event.preventDefault();
    const dataTable = $(event.target).closest('table').DataTable();
    const rowData = dataTable.row(event.currentTarget).data();
    if (!rowData) return;
    FlowRouter.go(`/workshop/${rowData._id}`);
  },
});
