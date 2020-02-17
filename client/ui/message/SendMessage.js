import { Template } from 'meteor/templating';
import { Members } from '/collections/members';
import { MessageTemplates } from '/collections/templates';
import { Messages } from '/collections/messages';
import { Memberships } from "/collections/memberships";
import { _ } from 'underscore';
import { memberStatus } from '/lib/utils';
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
    let familyMembers = [];
    Members.find({infamily: memberId}).forEach((m) => familyMembers.push(m.name));
    familyMembers = familyMembers.join(', ');
    const member = Members.findOne(memberId);
    const status = memberStatus(member);
    const template = MessageTemplates.findOne(templateId);
    const data = {
      name: member.name,
      email: member.email,
      family: member.family === true,
      familyMembers,
      youth: member.youth === true,
      liability: member.liability === true,
      memberStartDate: niceDate(status.memberStart),
      memberEndDate: niceDate(member.member),
      labStartDate: niceDate(status.labStart),
      labEndDate: niceDate(member.lab),
    };
    if (membershipId) {
      const membership = Memberships.findOne(membershipId);
      data.amount = membership.amount;
      data.type = membership.type;
      data.discount = membership.discount;
      data.startPeriod = niceDate(membership.start);
      data.endPeriod = niceDate(membership.end);
    }
    const subjectTemplate = _.template(template.subject);
    const messageTemplate = _.template(template.messagetext);
    return {
      to: member.email,
      subject: subjectTemplate(data),
      messagetext: messageTemplate(data),
    }
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