import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import '../../../lib/tabular/mails';
import './MailList.html';

Template.MailList.onCreated(function() {
  Meteor.subscribe('mails');
});

Template.MailList.helpers({
});

Template.MailList.events({
  'click .memberList tbody tr': function (event) {
    event.preventDefault();
    var dataTable = $(event.target).closest('table').DataTable();
    var rowData = dataTable.row(event.currentTarget).data();
    if (!rowData) return; // Won't be data if a placeholder row is clicked
    FlowRouter.go(`/mail/${rowData._id}`);
  }
});