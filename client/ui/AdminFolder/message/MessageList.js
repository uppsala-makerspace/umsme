import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import './MessageList.html';
import '../../../lib/tabular/messages';

Template.MessageList.onCreated(function() {
  Meteor.subscribe('messages');
});

Template.MessageList.helpers({
  selector() {
    const selector = {};
    if (this.membership) {
      selector.membership = this.membership;
    } else {
      selector.member = this.member;
    }
    return selector;
  },
});

Template.MessageList.events({
  'click .messageList tbody tr': function (event) {
    event.preventDefault();
    var dataTable = $(event.target).closest('table').DataTable();
    var rowData = dataTable.row(event.currentTarget).data();
    if (!rowData) return; // Won't be data if a placeholder row is clicked
    FlowRouter.go(`/message/${rowData._id}`);
  }
});