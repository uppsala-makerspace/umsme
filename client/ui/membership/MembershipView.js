import { Template } from 'meteor/templating';
import { Members } from '../../../collections/members.js';
import {Memberships} from "../../../collections/memberships";
import './MembershipView.html';

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
  Memberships() {
    return Memberships;
  },
  id() {
    return FlowRouter.getParam('_id');
  },
  membership() {
    return Memberships.findOne({'_id.str': FlowRouter.getParam('_id')});
  },
  member() {
    const membership = Memberships.findOne({'_id.str': FlowRouter.getParam('_id')});
    return Members.findOne({mid: membership.mid});
  }
});