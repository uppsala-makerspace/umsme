import { Template } from 'meteor/templating';
import { Members } from '../../../collections/members.js';
import './MemberView.html';
import "../membership/MembershipList";

Template.MemberView.onCreated(function() {
  const self = this;
  self.autorun(function() {
    self.subscribe('members');
  });
});
Template.MemberView.helpers({
  Members() {
    return Members;
  },
  id() {
    return FlowRouter.getParam('_id');
  },
  member: function() {
    const member = Members.findOne({'_id': new Mongo.ObjectID(FlowRouter.getParam('_id'))});
    console.log(member);
    return member;
  }
});