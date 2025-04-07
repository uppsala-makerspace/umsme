import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import '/lib/tabular/messageTemplates';

import './MessageTemplateList.html';

Template.MessageTemplateList.onCreated(function() {
  Meteor.subscribe('templates');
});

Template.MessageTemplateList.helpers({
});

Template.MessageTemplateList.events({
  'click .messageTemplateList tbody tr': function (event) {
    event.preventDefault();
    var dataTable = $(event.target).closest('table').DataTable();
    var rowData = dataTable.row(event.currentTarget).data();
    if (!rowData) return; // Won't be data if a placeholder row is clicked
    FlowRouter.go(`/template/${rowData._id}`);
  }
});