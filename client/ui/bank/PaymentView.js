import { Payments } from '/collections/payments';
import { Members } from '/collections/members';
import { Memberships } from '/collections/memberships';
import { fields } from '../../../lib/fields';
import './PaymentView.html';


Template.PaymentView.onCreated(function() {
  Meteor.subscribe('payments');
  Meteor.subscribe('members');
  Meteor.subscribe('memberships');
});

Template.PaymentView.helpers({
  Payments() {
    return Payments;
  },
  payment() {
    const id = FlowRouter.getParam('_id');
    return Payments.findOne(id);
  },
  status() {
    const payment = Payments.findOne(FlowRouter.getParam('_id'));
    let label = 'Untreated';
    let cls = 'danger';
    if (payment.membership) {
      label = 'Treated';
      cls = 'success';
    } else if (payment.other) {
      label = 'Other';
      cls = 'warning';
    }
    return {
      label,
      cls
    }
  },
  member() {
    const id = FlowRouter.getParam('_id');
    const payment = Payments.findOne(id);
    return Members.findOne(payment.member);
  },
  Memberships() {
    return Memberships;
  },
  membership() {
    const id = FlowRouter.getParam('_id');
    return Memberships.findOne({pid: id});
    //const payment = Payments.findOne(id);
    //return Members.findOne(payment.membership);
  },
  membershipSettings: function() {
    const pid = FlowRouter.getParam('_id');
    const payment = Payments.findOne(pid);
    return {
      collection:  Memberships.find({mid: payment.member, pid: {$exists: false}}),
      rowsPerPage: 30,
      showFilter: false,
      fields: fields.membership({
        filter: ['mid', 'pid'],
        enhance: [
          {
            key: 'start',
            sortOrder: 0,
            sortDirection: 'descending',
          }
        ]
      }),
      class: "table table-bordered table-hover",
    }
  },
  memberSettings: {
    collection: Members,
    rowsPerPage: 10,
    showFilter: true,
    fields: fields.member(),
    class: "table table-bordered table-hover",
  },
});

Template.PaymentView.events({
  'click .paymentMembers .reactive-table tbody tr': function (event, instance) {
    event.preventDefault();
    const id = FlowRouter.getParam('_id');
    Payments.update(id, {$set: {member: this._id}});
  },
  'click .removeMemberFromPayment': function (event) {
    if (confirm('Remove this member from the payment, the member will remain in the list.')) {
      const pid = FlowRouter.getParam('_id');
      const ms = Memberships.findOne({pid});
      if (ms) {
        Memberships.update(ms._id, {$unset: {pid}});
      }
      Payments.update(pid, {$unset: {member: ""}});
    }
  },
  'click .paymentMembership .reactive-table tbody tr': function (event, instance) {
    event.preventDefault();
    const pid = FlowRouter.getParam('_id');
    Memberships.update(this._id, {$set: {pid}});
    Payments.update(pid, {$set: {membership: this._id}});
  },
  'click .removePaymentFromMembership': function (event) {
    if (confirm('Disconnect the membership from the payment, the membership will remain and still be connected to the member.')) {
      const pid = FlowRouter.getParam('_id');
      const ms = Memberships.findOne({pid});
      Payments.update(pid, {$unset: {membership: ''}});
      Memberships.update(ms._id, {$unset: {pid}});
    }
  },
  'click .notAMembershipPayment': function (event) {
    const pid = FlowRouter.getParam('_id');
    Payments.update(pid, {$set: {other: true}});
  },
  'click .membershipPayment': function (event) {
    const pid = FlowRouter.getParam('_id');
    Payments.update(pid, {$unset: {other: false}});
  },
  'click .newMembership': function (event) {
    const pid = FlowRouter.getParam('_id');
    const payment = Payments.findOne(pid);
    FlowRouter.go(`/memberships/add?payment=${pid}&member=${payment.member}`);
  },
});
