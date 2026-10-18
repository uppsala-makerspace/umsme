import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import '/imports/tabular/expenses';
import { Expenses } from '/imports/common/collections/expenses';
import { ExpenseAccounts } from '/imports/common/collections/expenseAccounts';
import { Members } from '/imports/common/collections/members';
import { reimbursedSelector, todayIso, sumAmounts } from '/imports/expenses/reimbursedFilter';

import './ExpenseList.html';

// Work-queue views keyed by route name: filter the Expenses table by status.
const MODES = {
  expensesConfirm: { status: 'submitted', heading: 'Expenses to confirm' },
  expensesReimburse: { status: 'confirmed', heading: 'Expenses to reimburse or pay', split: true },
};

Template.ExpenseList.onCreated(function () {
  Meteor.subscribe('expenses');
  Meteor.subscribe('expenseAccounts');
  Meteor.subscribe('members');
});

Template.ExpenseList.helpers({
  heading() {
    return MODES[FlowRouter.getRouteName()]?.heading || 'Expenses';
  },
  selector() {
    const mode = MODES[FlowRouter.getRouteName()];
    return mode ? { status: mode.status } : {};
  },
  // The reimburse queue splits in two: invoices to pay the supplier (by due
  // date) and receipts to reimburse the member.
  split() {
    return !!MODES[FlowRouter.getRouteName()]?.split;
  },
  invoiceSelector() {
    return { status: MODES[FlowRouter.getRouteName()]?.status, type: 'invoice' };
  },
  receiptSelector() {
    return { status: MODES[FlowRouter.getRouteName()]?.status, type: { $ne: 'invoice' } };
  },
  showReimbursed() {
    return FlowRouter.getQueryParam('view') === 'reimbursed';
  },
});

Template.ExpenseList.events({
  'click .showQueue'() {
    FlowRouter.setQueryParams({ view: null, from: null, to: null });
  },
  'click .showReimbursed'() {
    FlowRouter.setQueryParams({ view: 'reimbursed' });
  },
  'click .expenseList tbody tr': function (event) {
    event.preventDefault();
    const dataTable = $(event.target).closest('table').DataTable();
    const rowData = dataTable.row(event.currentTarget).data();
    if (!rowData) return;
    FlowRouter.go(`/expense/${rowData._id}`);
  },
});

// The range lives in the URL so a reload or the back button keeps it. With no
// `from` parameter the range starts today; a cleared From field is stored as
// NO_FROM, meaning no lower bound.
const NO_FROM = 'any';
const range = () => {
  const from = FlowRouter.getQueryParam('from');
  return {
    from: from === NO_FROM ? '' : (from || todayIso()),
    to: FlowRouter.getQueryParam('to') || '',
  };
};

const kr = (n) => `${Number(n).toLocaleString('sv-SE', { maximumFractionDigits: 2 })} kr`;
const isoDate = (d) => (d ? d.toISOString().slice(0, 10) : '');

const reimbursed = () =>
  Expenses.find(reimbursedSelector(range()), { sort: { reimbursedDate: 1, date: 1 } }).fetch();

Template.ReimbursedExpenses.helpers({
  from() { return range().from; },
  to() { return range().to; },
  rows() {
    return reimbursed().map((e) => ({
      _id: e._id,
      paymentDate: isoDate(e.reimbursedDate),
      invoice: e.type === 'invoice',
      memberName: Members.findOne(e.memberId)?.name || e.memberId,
      place: e.place || '',
      accountName: ExpenseAccounts.findOne(e.expenseAccountId)?.name || '',
      amountText: typeof e.amount === 'number' ? kr(e.amount) : '',
    }));
  },
  total() { return kr(sumAmounts(reimbursed())); },
});

Template.ReimbursedExpenses.events({
  'change .reimbursedRange input'(event) {
    const { name, value } = event.currentTarget;
    if (name === 'from') FlowRouter.setQueryParams({ from: value || NO_FROM });
    else FlowRouter.setQueryParams({ to: value || null });
  },
  'click .reimbursedList tbody tr'(event) {
    FlowRouter.go(`/expense/${event.currentTarget.dataset.id}`);
  },
});
