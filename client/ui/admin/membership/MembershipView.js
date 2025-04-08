import { Template } from 'meteor/templating';
import { Members } from '/collections/members.js';
import { Memberships } from "/collections/memberships";
import { Payments } from "/collections/payments";
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { updateMember } from '/lib/utils';
import 'meteor/aldeed:autoform/static'
import '../message/InitiateMessage';
import '../message/MessageList';
import './MembershipView.html';
import '../comment/CommentList';

Template.MembershipView.onCreated(function() {
  Meteor.subscribe('memberships');
  Meteor.subscribe('members');
  Meteor.subscribe('payments');
});
Template.MembershipView.helpers({
  Members() {
    return Members;
  },
  Memberships() {
    return Memberships;
  },
  Payments() {
    return Payments;
  },
  payment() {
    const id = FlowRouter.getParam('_id');
    const ms = Memberships.findOne(id);
    if (ms?.pid) {
      return Payments.findOne(ms.pid);
    }
  },
  id() {
    return FlowRouter.getParam('_id');
  },
  membership() {
    const id = FlowRouter.getParam('_id');
    return Memberships.findOne(id);
  },
  membershipId() {
    return FlowRouter.getParam('_id');
  },
  memberId() {
    const id = FlowRouter.getParam('_id');
    const membership = Memberships.findOne(id);
    return membership?.mid;
  },
  member() {
    const id = FlowRouter.getParam('_id');
    const membership = Memberships.findOne(id);
    if (membership) {
      return Members.findOne(membership.mid);
    }
  },
});

Template.MembershipView.events({
  'click .deleteMembership': function (event) {
    if (confirm('Delete this membership record')) {
      const id = FlowRouter.getParam('_id');
      const membership = Memberships.findOne(id);
      if (membership.pid) {
        Payments.update(membership.pid, {$unset: {membership: ''}});
      }
      const mid = membership.mid;
      Memberships.remove(id);
      const mb = Members.findOne(mid);
      updateMember(mb);
      FlowRouter.go(`/admin/member/${mid}`);
    }
  },
  'click .removePaymentFromMembership': function (event) {
    if (confirm('Disconnect the payment from the membership, the payment will remain and be connected to the member.')) {
      const msid = FlowRouter.getParam('_id');
      const ms = Memberships.findOne(msid);
      Payments.update(ms.pid, {$unset: {membership: ''}});
      Memberships.update(ms._id, {$unset: {pid: ''}});
    }
  },
});

AutoForm.hooks({
  membershipViewForm: {
    endSubmit: function (doc) {
      const id = FlowRouter.getParam('_id');
      const membership = Memberships.findOne(id);
      if (!membership) {
        return;
      }
      const mid = membership.mid;
      const mb = Members.findOne(mid);
      updateMember(mb);
      FlowRouter.go(`/admin/member/${mid}`);
    }
  }
});