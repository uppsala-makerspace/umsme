import { Template } from 'meteor/templating';
import { Members } from '/collections/members';
import {Messages} from "/collections/messages";

import './MessageView.html';

Template.MessageView.onCreated(function() {
  const self = this;
  self.autorun(function() {
    self.subscribe('messages');
    self.subscribe('members');
  });
});
Template.MessageView.helpers({
  Messages() {
    return Messages;
  },
  message() {
    const id = FlowRouter.getParam('_id');
    return Messages.findOne(id);
  },
  member() {
    const id = FlowRouter.getParam('_id');
    const message = Messages.findOne(id);
    return Members.findOne(message.member);
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