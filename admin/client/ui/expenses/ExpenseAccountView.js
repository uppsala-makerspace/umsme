import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { ExpenseAccounts } from '/imports/common/collections/expenseAccounts';
import { Expenses } from '/imports/common/collections/expenses';
import { ExpenseBudgets } from '/imports/common/collections/expenseBudgets';
import { sortRevisions } from '/imports/common/lib/expenseBudget';
import { Groups } from '/imports/common/collections/groups';
import { GroupMemberships } from '/imports/common/collections/groupMemberships';
import { Members } from '/imports/common/collections/members';
import './ExpenseAccountView.html';
import { readDimensionInputs } from './ExpenseAccountDimensions';

Template.ExpenseAccountView.onCreated(function () {
  Meteor.subscribe('expenseAccounts');
  Meteor.subscribe('expenses');
  Meteor.subscribe('groups');
  Meteor.subscribe('groupMemberships');
  Meteor.subscribe('members');
  Meteor.subscribe('expenseBudgets');
  this.showApproverSelector = new ReactiveVar(false);
  this.budgetYear = new ReactiveVar(new Date().getFullYear());
  // The budget entry awaiting a second click to delete. An inline two-step
  // rather than confirm(): the native dialog does not always get drawn.
  this.deletingBudget = new ReactiveVar(null);
});

const kr = (n) => `${Number(n).toLocaleString('sv-SE', { maximumFractionDigits: 2 })} kr`;
const isoDate = (d) => {
  const date = new Date(d);
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

// Revisions for the selected year, newest first and ready for display.
const budgetRevisionsFor = (year) => {
  const revisions = sortRevisions(
    ExpenseBudgets.find({ expenseAccountId: FlowRouter.getParam('_id'), year }).fetch()
  );
  return revisions.map((r, i) => ({
    ...r,
    current: i === 0,
    amountText: kr(r.amount),
    dateText: isoDate(r.setAt),
    setByName: r.setBy ? Members.findOne(r.setBy)?.name || r.setBy : null,
  }));
};

const currentAccount = () => ExpenseAccounts.findOne(FlowRouter.getParam('_id'));

Template.ExpenseAccountView.helpers({
  ExpenseAccounts() {
    return ExpenseAccounts;
  },
  account() {
    return ExpenseAccounts.findOne(FlowRouter.getParam('_id'));
  },
  isUsed() {
    return !!Expenses.findOne({ expenseAccountId: FlowRouter.getParam('_id') });
  },
  allGroups() {
    return Groups.find({}, { sort: { 'name.sv': 1 } });
  },
  accountGroups() {
    const ids = currentAccount()?.groupIds || [];
    return Groups.find({ _id: { $in: ids } }, { sort: { 'name.sv': 1 } });
  },
  hasGroups() {
    return (currentAccount()?.groupIds || []).length > 0;
  },
  groupSelected(id) {
    return (currentAccount()?.groupIds || []).includes(id) ? 'selected' : '';
  },
  showApproverSelector() {
    return Template.instance().showApproverSelector.get();
  },
  // Active members of the account's groups who aren't approvers yet: the
  // guideline picks approvers from the groups the account belongs to.
  candidates() {
    const account = currentAccount();
    const groupIds = account?.groupIds || [];
    if (!groupIds.length) return [];
    const existing = account?.approverMemberIds || [];
    const byMember = new Map();
    for (const ms of GroupMemberships.find({ groupId: { $in: groupIds }, state: 'active' }).fetch()) {
      if (existing.includes(ms.memberId)) continue;
      const groupName = Groups.findOne(ms.groupId)?.name?.sv || ms.groupId;
      const entry = byMember.get(ms.memberId) || {
        _id: ms.memberId,
        name: Members.findOne(ms.memberId)?.name || ms.memberId,
        groups: [],
      };
      entry.groups.push(groupName);
      byMember.set(ms.memberId, entry);
    }
    return [...byMember.values()]
      .map((e) => ({ ...e, groupNames: e.groups.sort().join(', ') }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },
  approvers() {
    return (currentAccount()?.approverMemberIds || []).map((memberId) => {
      const member = Members.findOne(memberId);
      return { _id: memberId, name: member ? member.name : memberId };
    });
  },
  hasApprovers() {
    return (currentAccount()?.approverMemberIds || []).length > 0;
  },
  tooFewApprovers() {
    return (currentAccount()?.approverMemberIds || []).length === 1;
  },
  // This year and next, plus every year that already has a budget.
  budgetYears() {
    const thisYear = new Date().getFullYear();
    const years = new Set([thisYear, thisYear + 1]);
    ExpenseBudgets.find({ expenseAccountId: FlowRouter.getParam('_id') })
      .forEach((b) => years.add(b.year));
    return [...years].sort((a, b) => b - a);
  },
  budgetYear() {
    return Template.instance().budgetYear.get();
  },
  budgetYearSelected(year) {
    return Template.instance().budgetYear.get() === year ? 'selected' : '';
  },
  budgetRevisions() {
    return budgetRevisionsFor(Template.instance().budgetYear.get());
  },
  budget() {
    return budgetRevisionsFor(Template.instance().budgetYear.get())[0] || null;
  },
  today() {
    return isoDate(new Date());
  },
  isDeletingBudget(id) {
    return Template.instance().deletingBudget.get() === id;
  },
  // A revision must say why the budget changed; the first entry need not.
  commentAttrs() {
    return budgetRevisionsFor(Template.instance().budgetYear.get()).length ? { required: true } : {};
  },
});

Template.ExpenseAccountView.events({
  'click .deleteExpenseAccount': function () {
    const id = FlowRouter.getParam('_id');
    if (!confirm('Delete this expense account?')) return;
    ExpenseAccounts.remove(id, (err) => {
      if (err) {
        alert('Delete failed: ' + err.message);
        return;
      }
      FlowRouter.go('/expenses/accounts');
    });
  },
  'click .showApproverSelector': function (event, template) {
    template.showApproverSelector.set(true);
  },
  'click .hideApproverSelector': function (event, template) {
    template.showApproverSelector.set(false);
  },
  'click .addApprover': function (event, template) {
    event.preventDefault();
    const memberId = event.currentTarget.dataset.id;
    const id = FlowRouter.getParam('_id');
    ExpenseAccounts.update(id, { $push: { approverMemberIds: memberId } }, (err) => {
      if (err) alert('Could not add approver: ' + err.message);
    });
    template.showApproverSelector.set(false);
  },
  'change .budgetYearSelect': function (event, template) {
    template.budgetYear.set(Number(event.currentTarget.value));
    template.deletingBudget.set(null);
  },
  'click .deleteBudget': function (event, template) {
    event.preventDefault();
    template.deletingBudget.set(event.currentTarget.dataset.id);
  },
  'click .cancelDeleteBudget': function (event, template) {
    template.deletingBudget.set(null);
  },
  'click .confirmDeleteBudget': function (event, template) {
    Meteor.call('expenseBudgets.remove', event.currentTarget.dataset.id, (err) => {
      if (err) alert('Could not remove the budget entry: ' + (err.reason || err.message));
      template.deletingBudget.set(null);
    });
  },
  'submit .budgetForm': function (event, template) {
    event.preventDefault();
    const form = event.currentTarget;
    const amount = Number(form.amount.value);
    // A date input yields YYYY-MM-DD; read it as local noon so it cannot slip
    // into the neighbouring day in any timezone.
    const setAt = new Date(`${form.setAt.value}T12:00:00`);
    Meteor.call('expenseBudgets.add', {
      expenseAccountId: FlowRouter.getParam('_id'),
      year: template.budgetYear.get(),
      amount,
      setAt,
      comment: form.comment.value,
    }, (err) => {
      if (err) {
        alert('Could not save the budget: ' + (err.reason || err.message));
        return;
      }
      form.amount.value = '';
      form.comment.value = '';
    });
  },
  'click .removeApprover': function (event) {
    const id = FlowRouter.getParam('_id');
    ExpenseAccounts.update(id, { $pull: { approverMemberIds: event.currentTarget.dataset.id } });
  },
});

AutoForm.hooks({
  editExpenseAccountForm: {
    // Merge the custom dimension inputs into the update modifier; unset the
    // whole map when the treasurer clears every object field. Same for the
    // group select, which also lives outside AutoForm's schema fields.
    before: {
      update: function (modifier) {
        const dims = readDimensionInputs();
        if (Object.keys(dims).length) {
          modifier.$set = modifier.$set || {};
          modifier.$set.dimensions = dims;
        } else {
          modifier.$unset = modifier.$unset || {};
          modifier.$unset.dimensions = '';
        }
        const select = document.querySelector('.expenseAccountGroupSelect');
        const groupIds = select ? [...select.selectedOptions].map((o) => o.value).filter(Boolean) : [];
        if (groupIds.length) {
          modifier.$set = modifier.$set || {};
          modifier.$set.groupIds = groupIds;
        } else {
          modifier.$unset = modifier.$unset || {};
          modifier.$unset.groupIds = '';
        }
        // Approvers must stay active members of the account's groups, so drop
        // any who fall outside the new selection — otherwise the deny rule
        // would reject the whole update with a confusing error.
        const approvers = currentAccount()?.approverMemberIds || [];
        if (approvers.length) {
          const eligible = new Set(
            GroupMemberships.find({
              groupId: { $in: groupIds },
              memberId: { $in: approvers },
              state: 'active',
            }).map((ms) => ms.memberId)
          );
          const kept = approvers.filter((id) => eligible.has(id));
          if (kept.length !== approvers.length) {
            modifier.$set = modifier.$set || {};
            modifier.$set.approverMemberIds = kept;
          }
        }
        return modifier;
      },
    },
    onSuccess: function () {
      FlowRouter.go('/expenses/accounts');
    },
  },
});
