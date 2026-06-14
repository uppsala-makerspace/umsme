import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import moment from 'moment';
import { Expenses } from '/imports/common/collections/expenses';
import { ExpenseAccounts } from '/imports/common/collections/expenseAccounts';
import { Members } from '/imports/common/collections/members';

import './ExpenseView.html';

const STATUS_CLASS = {
  pending: 'default',
  submitted: 'info',
  confirmed: 'primary',
  rejected: 'danger',
  reimbursed: 'success',
};

Template.ExpenseView.onCreated(function () {
  Meteor.subscribe('expenses');
  Meteor.subscribe('expenseAccounts');
  Meteor.subscribe('members');
  this.receipt = new ReactiveVar(null);
  this.receiptOpen = new ReactiveVar(false);
  this.zoomed = new ReactiveVar(false);
  this.rejecting = new ReactiveVar(false);
  const id = FlowRouter.getParam('_id');
  Meteor.call('expenses.adminGetReceiptUrl', id, (err, res) => {
    if (err) {
      console.error('adminGetReceiptUrl failed', err);
      return;
    }
    this.receipt.set(res?.url || null);
  });
});

const currentExpense = () => Expenses.findOne(FlowRouter.getParam('_id'));

Template.ExpenseView.helpers({
  expense() {
    return currentExpense();
  },
  statusClass() {
    const e = currentExpense();
    return e ? (STATUS_CLASS[e.status] || 'default') : 'default';
  },
  isSubmitted() {
    return currentExpense()?.status === 'submitted';
  },
  isConfirmed() {
    return currentExpense()?.status === 'confirmed';
  },
  isReimbursed() {
    return currentExpense()?.status === 'reimbursed';
  },
  memberName() {
    const e = currentExpense();
    const m = e && Members.findOne(e.memberId);
    return m ? m.name : e?.memberId;
  },
  hasBankAccount() {
    const e = currentExpense();
    const m = e && Members.findOne(e.memberId);
    return !!(m && (m.bankClearing || m.bankAccountNumber));
  },
  bank() {
    const e = currentExpense();
    const m = e && Members.findOne(e.memberId);
    if (!m) return null;
    const clearing = (m.bankClearing || '').trim();
    const number = (m.bankAccountNumber || '').trim();
    // Plain concatenation as a convenience; the treasurer's bank validates and
    // applies any required zero-padding (account numbers carry check digits).
    const combined = `${clearing.replace(/\D/g, '')}${number.replace(/\D/g, '')}`;
    return { name: (m.bankName || '').trim(), clearing: clearing || '—', number: number || '—', combined };
  },
  account() {
    const e = currentExpense();
    return e?.expenseAccountId ? ExpenseAccounts.findOne(e.expenseAccountId) : null;
  },
  accountName() {
    const e = currentExpense();
    const a = e?.expenseAccountId && ExpenseAccounts.findOne(e.expenseAccountId);
    return a ? a.name : '—';
  },
  receipt() {
    return Template.instance().receipt.get();
  },
  receiptOpen() {
    return Template.instance().receiptOpen.get();
  },
  zoomed() {
    return Template.instance().zoomed.get();
  },
  rejecting() {
    return Template.instance().rejecting.get();
  },
  receiptFullStyle() {
    const base = 'display: inline-block; margin: 0 auto;';
    return Template.instance().zoomed.get()
      ? `max-width: none; cursor: zoom-out; ${base}`
      : `max-width: 100%; max-height: 100vh; cursor: zoom-in; ${base}`;
  },
  formatDate(date) {
    return date ? moment(date).format('YYYY-MM-DD') : '';
  },
});

Template.ExpenseView.events({
  'click .receiptThumb': function (event, instance) {
    instance.zoomed.set(false);
    instance.receiptOpen.set(true);
  },
  'click .receiptFull': function (event, instance) {
    // Toggle zoom; don't let the click bubble to the overlay (which closes).
    event.stopPropagation();
    instance.zoomed.set(!instance.zoomed.get());
  },
  'click .receiptOverlay': function (event, instance) {
    instance.receiptOpen.set(false);
  },
  'click .closeReceipt': function (event, instance) {
    instance.receiptOpen.set(false);
  },
  'click .confirmExpense': function () {
    const id = FlowRouter.getParam('_id');
    if (!confirm('Confirm this expense?')) return;
    Meteor.call('expenses.confirm', id, (err) => {
      if (err) alert('Confirm failed: ' + err.reason);
    });
  },
  'click .rejectExpense': function (event, instance) {
    instance.rejecting.set(true);
  },
  'click .cancelReject': function (event, instance) {
    instance.rejecting.set(false);
  },
  'click .confirmReject': function (event, instance) {
    const id = FlowRouter.getParam('_id');
    const field = instance.find('.rejectReason');
    const reason = (field?.value || '').trim();
    if (!reason) {
      alert('A reason is required.');
      return;
    }
    Meteor.call('expenses.reject', id, reason, (err) => {
      if (err) {
        alert('Reject failed: ' + err.reason);
        return;
      }
      instance.rejecting.set(false);
    });
  },
  'click .reimburseExpense': function () {
    const id = FlowRouter.getParam('_id');
    if (!confirm('Mark this expense as reimbursed?')) return;
    Meteor.call('expenses.reimburse', id, (err) => {
      if (err) alert('Reimburse failed: ' + err.reason);
    });
  },
  'click .unreimburseExpense': function () {
    const id = FlowRouter.getParam('_id');
    if (!confirm('Move this expense back to confirmed?')) return;
    Meteor.call('expenses.unreimburse', id, (err) => {
      if (err) alert('Revert failed: ' + err.reason);
    });
  },
});
