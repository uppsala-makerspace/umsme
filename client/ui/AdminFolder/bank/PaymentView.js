import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { Payments } from '/collections/payments';
import { Members } from '/collections/members';
import { Memberships } from '/collections/memberships';
import './PaymentView.html';
import '../comment/CommentList';

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
  id() {
    return FlowRouter.getParam('_id');
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
  async member() {
    const id = FlowRouter.getParam('_id');
    const payment = Payments.findOne(id);
    if (payment) {
      return Members.findOne(payment.member);
    }
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
/*  membershipSettings: function() {
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
    filter: "Matthias",
    fields: fields.member(),
    class: "table table-bordered table-hover",
  },*/
});

Template.PaymentView.events({
  'click .deletePayment': function (event) {
    const pid = FlowRouter.getParam('_id');
    const ms = Memberships.findOne({pid});
    if (ms) {
      alert('Cannot delete payment as long as it is connected to a membership.');
      return;
    }
    if (confirm('Delete this payment?')) {
      Payments.remove(pid);
      FlowRouter.go('/payments');
    }
  },
  'click .memberList tbody tr': async function (event, instance) {
    event.preventDefault();
    const dataTable = $(event.target).closest('table').DataTable();
    const rowData = dataTable.row(event.currentTarget).data();
    if (!rowData) return; // Won't be data if a placeholder row is clicked

    const id = FlowRouter.getParam('_id');
    Payments.updateAsync(id, {$set: {member: rowData._id}});
    // Update the mobile number if it is set.
    const payment = await Payments.findOneAsync(id);
    const member = Members.findOneAsync(rowData._id);
    if (payment.mobile && !member.mobile) {
      Members.updateAsync(rowData._id, {$set: {mobile: payment.mobile}});
    }
  },
  'click .removeMemberFromPayment': function (event) {
    if (confirm('Remove this member from the payment, the member will remain in the list.')) {
      const pid = FlowRouter.getParam('_id');
      const ms = Memberships.findOne({pid});
      if (ms) {
        Memberships.update(ms._id, {$unset: {pid}});
      }
      Payments.update(pid, {$unset: {member: "", membership: ""}});
    }
  },
/*  'click .memberList tbody tr': function (event, instance) {
    event.preventDefault();
    const dataTable = $(event.target).closest('table').DataTable();
    const rowData = dataTable.row(event.currentTarget).data();
    if (!rowData) return; // Won't be data if a placeholder row is clicked
    const pid = FlowRouter.getParam('_id');
    Memberships.updateAsync(rowData._id, {$set: {pid}});
    Payments.updateAsync(pid, {$set: {membership: rowData._id}});
  },*/
  'click .removePaymentFromMembership': function (event) {
    if (confirm('Disconnect the membership from the payment, the membership will remain and still be connected to the member.')) {
      const pid = FlowRouter.getParam('_id');
      const ms = Memberships.findOne({pid});
      Payments.updateAsync(pid, {$unset: {membership: ''}});
      Memberships.updateAsync(ms._id, {$unset: {pid}});
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
