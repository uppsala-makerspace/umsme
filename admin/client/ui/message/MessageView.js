import { Template } from 'meteor/templating';
import { Members } from '/imports/common/collections/members';
import { Messages } from "/imports/common/collections/messages";
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import './MessageView.html';

Template.MessageView.onCreated(function() {
  Meteor.subscribe('messages');
  Meteor.subscribe('members');
});
Template.MessageView.helpers({
  Messages() {
    return Messages;
  },
  message() {
    const id = FlowRouter.getParam('_id');
    return Messages.findOne(id);
  },
  async member() {
    const id = FlowRouter.getParam('_id');
    const message = await Messages.findOneAsync(id);
    if (message) {
      return Members.findOne(message.member);
    }
  },
});

Template.MessageView.events({
  'click .deleteMessage': function (event) {
    if (!confirm('Delete this message? This cannot be undone.')) return;
    const id = FlowRouter.getParam('_id');
    const message = Messages.findOne(id);
    if (!message) return;
    Messages.remove(id);
    FlowRouter.go(`/member/${message.member}`);
  },
});