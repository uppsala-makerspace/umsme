import { Template } from 'meteor/templating';
import { Members } from '/collections/members.js';
import { Memberships } from "/collections/memberships";
import { Payments } from "/collections/payments";
import { updateMember } from '/lib/utils';
import '../message/InitiateMessage';
import '../message/MessageList';
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
  Payments() {
    return Payments;
  },
  payment() {
    const id = FlowRouter.getParam('_id');
    const ms = Memberships.findOne(id);
    if (ms.pid) {
      return Payments.findOne(ms.pid);
    }
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
    return membership.mid;
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
      if (membership.pid) {
        Payments.update(membership.pid, {$unset: {membership: ''}});
      }
      const mid = membership.mid;
      Memberships.remove(id);
      const mb = Members.findOne(mid);
      updateMember(mb);
      FlowRouter.go(`/member/${mid}`);
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
      const mid = membership.mid;
      const mb = Members.findOne(mid);
      updateMember(mb);
      FlowRouter.go(`/member/${mid}`);
    }
  }
});