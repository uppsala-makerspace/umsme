import { Template } from 'meteor/templating';
import { Messages } from '/collections/messages';
import { fields } from '/lib/fields';
import './MessageList.html';

Template.MessageList.onCreated(function() {
  Meteor.subscribe('messages');
});

Template.MessageList.helpers({
  settings() {
    const selector = {};
    if (this.membership) {
      selector.membership = this.membership;
    } else {
      selector.member = this.member;
    }
    return {
      collection: Messages.find(selector),
      rowsPerPage: 10,
      showFilter: false,
      fields: fields.message(),
      showNavigation: 'auto',
      class: "table table-bordered table-hover",
    }
  }
});

Template.MessageList.events({
  'click .reactive-table tbody tr': function (event) {
    event.preventDefault();
    FlowRouter.go(`/message/${this._id}`);
  }
});