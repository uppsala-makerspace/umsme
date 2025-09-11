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
  'click .gobacktoMember': function (event) {
    const id = FlowRouter.getParam('_id');
    const message = Messages.findOne(id);
    FlowRouter.go(`/member/${message.mid}`);
  }
});

AutoForm.hooks({
  messageViewForm: {
    endSubmit: function (doc) {
      debugger;
      const id = FlowRouter.getParam('_id');
      const message = Messages.findOne(id);
      FlowRouter.go(`/member/${message.mid}`);
    }
  }
});