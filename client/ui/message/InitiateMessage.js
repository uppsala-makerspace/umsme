import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { Members } from '/collections/members';
import { Memberships } from '/collections/memberships';
import { MessageTemplates } from '/collections/templates';
import './InitiateMessage.html';

Template.InitiateMessage.onCreated(function() {
  Meteor.subscribe('memberships');
  Meteor.subscribe('members');
  Meteor.subscribe('templates');
});

const getTemplate = (mid, msid, type) => {
  const mb = Members.findOne(mid);
  const ms = Memberships.findOne(msid);
  const membertype = mb.family === true ? 'family' : (mb.youth === true ? 'youth' : 'normal');
  const membershiptype = ms.type;
  let template = MessageTemplates.findOne({ type, membertype, membershiptype, deprecated: false, });
  if (!template && membertype === 'youth') {
    template = MessageTemplates.findOne({ type, membertype: 'normal', membershiptype, deprecated: false, });
  }
  if (!template) {
    const mt = membertype === 'youth' ? "youth/normal" : membertype;
    alert(`No non-deprecated template of type "${type}" with member type "${mt}" and membership type "${membershiptype}" found.`);
  }
  return template;
};

Template.InitiateMessage.events({
  'click .welcomeButton':  function (event) {
    event.preventDefault();
    const template  = getTemplate(this.member, this.membership, 'welcome');
    template && FlowRouter.go(`/message/send?member=${this.member}&template=${template._id}&membership=${this.membership}`);
  },
  'click .confirmButton':  function (event) {
    event.preventDefault();
    const template = getTemplate(this.member, this.membership, 'confirmation');
    template && FlowRouter.go(`/message/send?member=${this.member}&template=${template._id}&membership=${this.membership}`);
  },
});