import { Template } from 'meteor/templating';
import { Members } from '../../../collections/members.js';
import {Memberships} from "../../../collections/memberships";
import './MembershipView.html';

Template.MembershipView.onCreated(function() {
  const self = this;
  self.autorun(function() {
    self.subscribe('memberships');
    self.subscribe('members');
  });
});
Template.MembershipView.helpers({
  Members() {
    return Members;
  },
  Memberships() {
    return Memberships;
  },
  membership() {
    const id = FlowRouter.getParam('_id');
    return Memberships.findOne(id);
  },
  member() {
    const id = FlowRouter.getParam('_id');
    const membership = Memberships.findOne(id);
    return Members.findOne(membership.mid);
  },
});

Template.MembershipView.events({
  'click .deleteMembership': function (event) {
    if (confirm('Delete this membership record')) {
      const id = FlowRouter.getParam('_id');
      const membership = Memberships.findOne(id);
      const mid = membership.mid;
      Memberships.remove(id);
      FlowRouter.go(`/member/${mid}`);
    }
  }
});

AutoForm.hooks({
  membershipViewForm: {
    endSubmit: function (doc) {
      const id = FlowRouter.getParam('_id');
      const membership = Memberships.findOne(id);
      const mid = membership.mid;
      FlowRouter.go(`/member/${mid}`);
    }
  }
});