import { Template } from 'meteor/templating';
import { Members } from '/collections/members';
import { MessageTemplates } from '/collections/templates';
import { Messages } from '/collections/messages';
import { messageData } from "/lib/message";
import './SendMessage.html';

Template.SendMessage.onCreated(function() {
  Meteor.subscribe('members');
  Meteor.subscribe('templates');
  Meteor.subscribe('messages');
  Meteor.subscribe('memberships');
});

const niceDate = (date) => {
  if (date) {
    return moment(date).format("YYYY-MM-DD");
  }
  return '';
};

Template.SendMessage.helpers({
  Messages() {
    return Messages;
  },
  member() {
    return Members.findOne(FlowRouter.getQueryParam('member')) || {};
  },
  template() {
    const templateId = FlowRouter.getQueryParam('template');
    return MessageTemplates.findOne(templateId);
  },
  message() {
    const memberId = FlowRouter.getQueryParam('member');
    const templateId = FlowRouter.getQueryParam('template');
    const membershipId = FlowRouter.getQueryParam('membership');
    return messageData(memberId, templateId, membershipId);
  }
});

AutoForm.hooks({
  insertMessageForm: {
    beginSubmit: function() {
      const insdoc = this.insertDoc;
      const memberId = FlowRouter.getQueryParam('member');
      const templateId = FlowRouter.getQueryParam('template');
      const template = MessageTemplates.findOne(templateId);
      const membershipId = FlowRouter.getQueryParam('membership');
      if (membershipId) {
        insdoc.membership = membershipId;
      }
      insdoc.senddate = new Date();
      insdoc.member = memberId;
      insdoc.template = templateId;
      insdoc.type = template.type;
    },
    onSubmit: function (doc) {
      // Send message as mail.
      Meteor.call('mail', doc.to, doc.subject, doc.messagetext);
      Messages.insert(doc);
      this.done();
      const memberId = FlowRouter.getQueryParam('member');
      if (doc.type === 'reminder') {
        Members.update(memberId, {$set: {reminder: new Date()}});
      }
      FlowRouter.go(`/member/${memberId}`);
      return false;
    }
  }
});