import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
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
  async messageAsync() {
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
      const memberId = FlowRouter.getQueryParam('member');
      Meteor.callAsync('mail', doc.to, doc.subject, doc.messagetext).then(() => {
        Messages.insert(doc);
        this.done();
        if (doc.type === 'reminder') {
          Members.update(memberId, {$set: {reminder: new Date()}});
        }
        FlowRouter.go(`/member/${memberId}`);
      }).catch((err) => {
        alert(`Could not send email: ${err}`);
        FlowRouter.go(`/member/${memberId}`);
      })
      return false;
    }
  }
});