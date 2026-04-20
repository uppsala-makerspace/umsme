import { Template } from 'meteor/templating';
import { Members } from '/imports/common/collections/members';
import { Memberships } from '/imports/common/collections/memberships';
import '../members/MemberStatus';
import './PendingMembers.html';

Template.PendingMembers.onCreated(function () {
  this.subscribe('members');
  this.subscribe('memberships');
  this.subscribe('users');
});

Template.PendingMembers.helpers({
  pendingMembers() {
    return Members.find(
      { registered: { $ne: true }, infamily: { $exists: false }, member: { $exists: true } },
      { sort: { name: 1 } }
    );
  },
  totalPaid(memberId) {
    const memberships = Memberships.find({ mid: memberId }).fetch();
    return memberships.reduce((sum, ms) => sum + (ms.amount || 0), 0);
  },
  linkedUser(email) {
    if (email) {
      return Meteor.users.findOne({ 'emails.address': email });
    }
  },
});

Template.PendingMembers.events({
  'click .acceptMember'(event) {
    const id = event.currentTarget.dataset.id;
    Members.update(id, { $set: { registered: true } });
  },
});
