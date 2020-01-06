import { Template } from 'meteor/templating';
import { Messages } from '/collections/messages';
import { Members } from '/collections/members';
import { fields } from '/lib/fields';
import './MessageList.html';

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
      fields: fields.message.filter((field) => (field.key === 'type'
        || field.key === 'subject' || field.key === 'senddate')),
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