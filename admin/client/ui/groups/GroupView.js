import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { Groups } from '/imports/common/collections/groups';
import { GroupMemberships } from '/imports/common/collections/groupMemberships';
import { Workshops } from '/imports/common/collections/workshops';
import { ExpenseAccounts } from '/imports/common/collections/expenseAccounts';
import { Members } from '/imports/common/collections/members';
import { groupCompleteness } from '/imports/common/lib/groupRules';
import '/imports/tabular/members';
import '../spaces/EntitySpaces';
import './GroupView.html';

const groupId = () => FlowRouter.getParam('_id');

// Linked roles are synced from membership, so every membership edit in this
// view is followed by a server-side re-sync.
const syncLinkedRole = () => {
  Meteor.call('adminGroups.syncLinkedRole', groupId(), (err) => {
    if (err) console.error('linked role sync failed', err);
  });
};

// Make someone an active member (insert, or flip a pending request).
const ensureActiveMembership = (memberId, done) => {
  const existing = GroupMemberships.findOne({ groupId: groupId(), memberId });
  const finish = (err) => {
    if (err) {
      alert('Membership update failed: ' + err.message);
      return;
    }
    syncLinkedRole();
    done && done();
  };
  if (existing) {
    if (existing.state === 'active') {
      finish();
      return;
    }
    GroupMemberships.update(existing._id, {
      $set: { state: 'active', approvedAt: new Date(), approvedBy: '__system__' },
    }, finish);
    return;
  }
  GroupMemberships.insert({
    groupId: groupId(),
    memberId,
    state: 'active',
    requestedAt: new Date(),
    approvedAt: new Date(),
    approvedBy: '__system__',
  }, finish);
};

const membershipWithNames = (state) =>
  GroupMemberships.find({ groupId: groupId(), state }).map((m) => {
    const member = Members.findOne(m.memberId);
    return {
      _id: m._id,
      memberId: m.memberId,
      name: member ? member.name : m.memberId,
      isResponsible: Groups.findOne(groupId())?.responsibleMemberId === m.memberId,
    };
  });

Template.GroupView.onCreated(function () {
  Meteor.subscribe('groups');
  Meteor.subscribe('groupMemberships');
  Meteor.subscribe('workshops');
  Meteor.subscribe('expenseAccounts');
  Meteor.subscribe('members');
  Meteor.subscribe('spaces');
  this.showResponsibleSelector = new ReactiveVar(false);
  this.showMemberSelector = new ReactiveVar(false);
  this.uploading = new ReactiveVar(false);
});

Template.GroupView.helpers({
  Groups() {
    return Groups;
  },
  groupIdValue() {
    return groupId();
  },
  group() {
    return Groups.findOne(groupId());
  },
  completeness() {
    return groupCompleteness(Groups.findOne(groupId()));
  },
  missingList() {
    return groupCompleteness(Groups.findOne(groupId())).missing.join(', ');
  },
  isDeletable() {
    const id = groupId();
    if (Groups.findOne(id)?.imageFileId) return false;
    return !(
      Workshops.findOne({ groupId: id }) ||
      GroupMemberships.findOne({ groupId: id }) ||
      ExpenseAccounts.findOne({ groupId: id }) ||
      Groups.findOne({ parentGroupId: id })
    );
  },
  imageUrl() {
    const group = Groups.findOne(groupId());
    if (!group?.imageFileId) return '';
    return `/api/groups/${group._id}/image?v=${encodeURIComponent(group.imageFileId)}`;
  },
  uploading() {
    return Template.instance().uploading.get();
  },
  uploadingAttr() {
    return Template.instance().uploading.get() ? 'disabled' : '';
  },
  responsibleMember() {
    const group = Groups.findOne(groupId());
    return group?.responsibleMemberId ? Members.findOne(group.responsibleMemberId) : null;
  },
  showResponsibleSelector() {
    return Template.instance().showResponsibleSelector.get();
  },
  showMemberSelector() {
    return Template.instance().showMemberSelector.get();
  },
  workshopGroups() {
    return Groups.find(
      { type: 'workshop', _id: { $ne: groupId() } },
      { sort: { 'name.sv': 1 } }
    );
  },
  isResponsibilityGroup() {
    return Groups.findOne(groupId())?.type === 'responsibility';
  },
  // Only interest and function groups pick spaces directly; workshop and
  // responsibility groups inherit them from their connected workshop.
  canChooseSpaces() {
    return ['interest', 'function'].includes(Groups.findOne(groupId())?.type);
  },
  parentGroup() {
    const group = Groups.findOne(groupId());
    return group?.parentGroupId ? Groups.findOne(group.parentGroupId) : null;
  },
  parentSelected(id) {
    return Groups.findOne(groupId())?.parentGroupId === id ? 'selected' : '';
  },
  noParentSelected() {
    return Groups.findOne(groupId())?.parentGroupId ? '' : 'selected';
  },
  relatedWorkshops() {
    const ids = Groups.findOne(groupId())?.relatedWorkshopIds || [];
    return Workshops.find({ _id: { $in: ids } }, { sort: { 'name.sv': 1 } });
  },
  hasRelatedWorkshops() {
    return (Groups.findOne(groupId())?.relatedWorkshopIds || []).length > 0;
  },
  addableWorkshops() {
    const ids = Groups.findOne(groupId())?.relatedWorkshopIds || [];
    return Workshops.find({ _id: { $nin: ids } }, { sort: { 'name.sv': 1 } });
  },
  activeMembers() {
    return membershipWithNames('active');
  },
  hasActiveMembers() {
    return GroupMemberships.find({ groupId: groupId(), state: 'active' }).count() > 0;
  },
  pendingMembers() {
    return membershipWithNames('pending');
  },
  hasPendingMembers() {
    return GroupMemberships.find({ groupId: groupId(), state: 'pending' }).count() > 0;
  },
  workshop() {
    return Workshops.findOne({ groupId: groupId() });
  },
  childGroups() {
    return Groups.find({ parentGroupId: groupId() }, { sort: { 'name.sv': 1 } });
  },
  hasChildGroups() {
    return Groups.find({ parentGroupId: groupId() }).count() > 0;
  },
  expenseAccounts() {
    return ExpenseAccounts.find({ groupId: groupId() }, { sort: { name: 1 } });
  },
  hasExpenseAccounts() {
    return ExpenseAccounts.find({ groupId: groupId() }).count() > 0;
  },
});

Template.GroupView.events({
  'click .deleteGroup': function () {
    if (!confirm('Delete this group?')) return;
    Groups.remove(groupId(), (err) => {
      if (err) {
        alert('Delete failed: ' + err.message);
        return;
      }
      FlowRouter.go('/groups');
    });
  },
  'click .uploadImage': function (event, template) {
    const input = template.find('.imageFileInput');
    const file = input.files && input.files[0];
    if (!file) {
      alert('Choose an image file first.');
      return;
    }
    template.uploading.set(true);
    const reader = new FileReader();
    reader.onload = () => {
      // reader.result is a data: URL; the method wants raw base64.
      const base64 = String(reader.result).split(',')[1] || '';
      Meteor.call('adminGroups.uploadImage', groupId(), base64, file.type, (err) => {
        template.uploading.set(false);
        if (err) {
          alert('Upload failed: ' + err.message);
          return;
        }
        input.value = '';
      });
    };
    reader.onerror = () => {
      template.uploading.set(false);
      alert('Could not read the file.');
    };
    reader.readAsDataURL(file);
  },
  'click .removeImage': function () {
    if (!confirm('Remove the group image?')) return;
    Meteor.call('adminGroups.removeImage', groupId(), (err) => {
      if (err) alert('Remove failed: ' + err.message);
    });
  },
  'click .showResponsibleSelector': function (event, template) {
    template.showResponsibleSelector.set(true);
  },
  'click .hideResponsibleSelector': function (event, template) {
    template.showResponsibleSelector.set(false);
  },
  'click .responsibleList tbody tr': function (event, template) {
    if (event.target.nodeName === 'A') return;
    event.preventDefault();
    const dataTable = $(event.target).closest('table').DataTable();
    const rowData = dataTable.row(event.currentTarget).data();
    if (!rowData) return;
    ensureActiveMembership(rowData._id, () => {
      Groups.update(groupId(), { $set: { responsibleMemberId: rowData._id } }, (err) => {
        if (err) alert('Update failed: ' + err.message);
      });
    });
    template.showResponsibleSelector.set(false);
  },
  'click .clearResponsible': function () {
    if (!confirm('Clear the group responsible?')) return;
    Groups.update(groupId(), { $unset: { responsibleMemberId: '' } }, (err) => {
      if (err) alert('Update failed: ' + err.message);
    });
  },
  'click .saveParentGroup': function (event, template) {
    const value = template.find('.parentGroupSelect').value;
    const modifier = value
      ? { $set: { parentGroupId: value } }
      : { $unset: { parentGroupId: '' } };
    Groups.update(groupId(), modifier, (err) => {
      if (err) alert('Update failed: ' + err.message);
    });
  },
  'click .addRelatedWorkshop': function (event, template) {
    const value = template.find('.relatedWorkshopSelect').value;
    if (!value) return;
    Groups.update(groupId(), { $addToSet: { relatedWorkshopIds: value } }, (err) => {
      if (err) alert('Update failed: ' + err.message);
    });
  },
  'click .removeRelatedWorkshop': function (event) {
    Groups.update(groupId(), { $pull: { relatedWorkshopIds: event.currentTarget.dataset.id } }, (err) => {
      if (err) alert('Update failed: ' + err.message);
    });
  },
  'click .showMemberSelector': function (event, template) {
    template.showMemberSelector.set(true);
  },
  'click .hideMemberSelector': function (event, template) {
    template.showMemberSelector.set(false);
  },
  'click .addMemberList tbody tr': function (event, template) {
    if (event.target.nodeName === 'A') return;
    event.preventDefault();
    const dataTable = $(event.target).closest('table').DataTable();
    const rowData = dataTable.row(event.currentTarget).data();
    if (!rowData) return;
    ensureActiveMembership(rowData._id);
    template.showMemberSelector.set(false);
  },
  'click .approveMember': function (event) {
    ensureActiveMembership(event.currentTarget.dataset.id);
  },
  'click .rejectMember': function (event) {
    const memberId = event.currentTarget.dataset.id;
    const membership = GroupMemberships.findOne({ groupId: groupId(), memberId, state: 'pending' });
    if (!membership) return;
    GroupMemberships.remove(membership._id, (err) => {
      if (err) alert('Reject failed: ' + err.message);
    });
  },
  'click .removeMember': function (event) {
    const memberId = event.currentTarget.dataset.id;
    const group = Groups.findOne(groupId());
    if (group?.responsibleMemberId === memberId) {
      alert('This member is the group responsible. Assign a new responsible (or clear it) first.');
      return;
    }
    if (!confirm('Remove this member from the group?')) return;
    const membership = GroupMemberships.findOne({ groupId: groupId(), memberId });
    if (!membership) return;
    GroupMemberships.remove(membership._id, (err) => {
      if (err) {
        alert('Remove failed: ' + err.message);
        return;
      }
      syncLinkedRole();
    });
  },
});

AutoForm.hooks({
  groupViewForm: {
    onSuccess: function () {
      // linkedRole may have changed; membership is unchanged but the managed
      // role might now be a different one.
      syncLinkedRole();
    },
  },
});
