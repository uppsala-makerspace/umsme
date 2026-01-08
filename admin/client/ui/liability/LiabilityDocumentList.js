import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import '/imports/tabular/liabilityDocuments';

import './LiabilityDocumentList.html';

Template.LiabilityDocumentList.onCreated(function() {
  Meteor.subscribe('liabilityDocuments');
});

Template.LiabilityDocumentList.helpers({
});

Template.LiabilityDocumentList.events({
  'click .liabilityDocumentList tbody tr': function (event) {
    event.preventDefault();
    var dataTable = $(event.target).closest('table').DataTable();
    var rowData = dataTable.row(event.currentTarget).data();
    if (!rowData) return;
    FlowRouter.go(`/liability/${rowData._id}`);
  }
});
