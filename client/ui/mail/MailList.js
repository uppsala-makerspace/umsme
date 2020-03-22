import { Template } from 'meteor/templating';
import { Mails } from '/collections/mails';
import { fields } from '/lib/fields';
import './MailList.html';

Template.MailList.onCreated(function() {
  Meteor.subscribe('mails');
});

Template.MailList.helpers({
  settings: {
    collection: Mails,
    rowsPerPage: 10,
    showFilter: true,
    fields: fields.mail(),
    class: "table table-bordered table-hover",
  }
});

Template.MailList.events({
  'click .reactive-table tbody tr': function (event) {
    event.preventDefault();
    FlowRouter.go(`/mail/${this._id}`);
  }
});