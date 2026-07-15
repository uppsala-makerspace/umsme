import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { ExpenseAccounts } from '/imports/common/collections/expenseAccounts';
import { Expenses } from '/imports/common/collections/expenses';
import { Groups } from '/imports/common/collections/groups';
import { Members } from '/imports/common/collections/members';
import '/imports/tabular/members';
import './ExpenseAccountView.html';
import { readDimensionInputs } from './ExpenseAccountDimensions';

Template.ExpenseAccountView.onCreated(function () {
  Meteor.subscribe('expenseAccounts');
  Meteor.subscribe('expenses');
  Meteor.subscribe('groups');
  Meteor.subscribe('members');
  this.showApproverSelector = new ReactiveVar(false);
});

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
  accountGroup() {
    const account = ExpenseAccounts.findOne(FlowRouter.getParam('_id'));
    return account?.groupId ? Groups.findOne(account.groupId) : null;
  },
  groupSelected(id) {
    const account = ExpenseAccounts.findOne(FlowRouter.getParam('_id'));
    return account?.groupId === id ? 'selected' : '';
  },
  noGroupSelected() {
    const account = ExpenseAccounts.findOne(FlowRouter.getParam('_id'));
    return account?.groupId ? '' : 'selected';
  },
  showApproverSelector() {
    return Template.instance().showApproverSelector.get();
  },
  approvers() {
    const account = ExpenseAccounts.findOne(FlowRouter.getParam('_id'));
    return (account?.approverMemberIds || []).map((memberId) => {
      const member = Members.findOne(memberId);
      return { _id: memberId, name: member ? member.name : memberId };
    });
  },
  hasApprovers() {
    const account = ExpenseAccounts.findOne(FlowRouter.getParam('_id'));
    return (account?.approverMemberIds || []).length > 0;
  },
  tooFewApprovers() {
    const account = ExpenseAccounts.findOne(FlowRouter.getParam('_id'));
    return (account?.approverMemberIds || []).length === 1;
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
  'click .approverList tbody tr': function (event, template) {
    if (event.target.nodeName === 'A') return;
    event.preventDefault();
    const dataTable = $(event.target).closest('table').DataTable();
    const rowData = dataTable.row(event.currentTarget).data();
    if (!rowData) return;
    const id = FlowRouter.getParam('_id');
    const account = ExpenseAccounts.findOne(id);
    if (!(account?.approverMemberIds || []).includes(rowData._id)) {
      ExpenseAccounts.update(id, { $push: { approverMemberIds: rowData._id } });
    }
    template.showApproverSelector.set(false);
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
        const group = document.querySelector('.expenseAccountGroupSelect')?.value;
        if (group) {
          modifier.$set = modifier.$set || {};
          modifier.$set.groupId = group;
        } else {
          modifier.$unset = modifier.$unset || {};
          modifier.$unset.groupId = '';
        }
        return modifier;
      },
    },
    onSuccess: function () {
      FlowRouter.go('/expenses/accounts');
    },
  },
});
