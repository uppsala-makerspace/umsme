import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import '/imports/tabular/certificates';

import './CertificateList.html';

Template.CertificateList.onCreated(function() {
  Meteor.subscribe('certificates');
});

Template.CertificateList.helpers({
});

Template.CertificateList.events({
  'click .certificateList tbody tr': function (event) {
    event.preventDefault();
    var dataTable = $(event.target).closest('table').DataTable();
    var rowData = dataTable.row(event.currentTarget).data();
    if (!rowData) return;
    FlowRouter.go(`/certificate/${rowData._id}`);
  }
});
