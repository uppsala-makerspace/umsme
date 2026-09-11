import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { Members } from '/imports/common/collections/members';
import { Memberships } from '/imports/common/collections/memberships';
import { MessageTemplates } from '/imports/common/collections/templates';
import { Messages } from '/imports/common/collections/messages';
import { Payments } from '/imports/common/collections/payments';
import { Mails } from '/imports/common/collections/mails';
import { Comments } from '/imports/common/collections/comments';
import { Unlocks } from '/imports/common/collections/unlocks';
import { DoorUnlocks } from '/imports/common/collections/doorunlocks';
import { initiatedPayments } from '/imports/common/collections/initiatedPayments';
import { LiabilityDocuments } from '/imports/common/collections/liabilityDocuments';
import { Certificates } from '/imports/common/collections/certificates';
import { Attestations } from '/imports/common/collections/attestations';
import { Announcements } from '/imports/common/collections/announcements';
import Invites from '/imports/common/collections/Invites';
import { Expenses } from '/imports/common/collections/expenses';
import { ExpenseAccounts } from '/imports/common/collections/expenseAccounts';
import { Groups } from '/imports/common/collections/groups';
import { Workshops } from '/imports/common/collections/workshops';
import { GroupMemberships } from '/imports/common/collections/groupMemberships';
import { Spaces } from '/imports/common/collections/spaces';
import { StoreItems } from '/imports/common/collections/storeItems';
import {
  StorageUnits,
  StorageRequests,
  StorageAssignments,
  StorageWarnings,
  StorageExemptions,
  StorageMoves,
  StorageNotificationDeliveries,
  StorageEvents,
} from '/imports/common/collections/storage';

const createAuthFuncForRoles = (col, roles) => async function () {
  if (this.userId && (await Roles.userIsInRoleAsync(this.userId, roles))) {
    return col.find();
  }
  this.ready();
};

const createAuthFuncFor = (col) => createAuthFuncForRoles(col, ['admin', 'board']);

export default () => {
  // Treasurer included so a treasurer-only account can see member name + bank
  // details when reimbursing an expense.
  Meteor.publish('members', createAuthFuncForRoles(Members, ['admin', 'board', 'treasurer']));
  Meteor.publish('memberships', createAuthFuncFor(Memberships));
  Meteor.publish('templates', createAuthFuncFor(MessageTemplates));
  Meteor.publish('messages', createAuthFuncFor(Messages));
  Meteor.publish('mails', createAuthFuncFor(Mails));
  Meteor.publish('payments', createAuthFuncFor(Payments));
  Meteor.publish('comments', createAuthFuncFor(Comments));
  Meteor.publish('unlocks', createAuthFuncFor(Unlocks));
  Meteor.publish('doorunlocks', createAuthFuncFor(DoorUnlocks));
  Meteor.publish('users', createAuthFuncFor(Meteor.users));
  Meteor.publish(null, createAuthFuncFor(Meteor.roles));
  Meteor.publish('initiatedPayments', createAuthFuncFor(initiatedPayments));
  Meteor.publish('liabilityDocuments', createAuthFuncFor(LiabilityDocuments));
  Meteor.publish('certificates', createAuthFuncFor(Certificates));
  Meteor.publish('attestations', createAuthFuncFor(Attestations));
  Meteor.publish('announcements', createAuthFuncFor(Announcements));
  Meteor.publish('invites', createAuthFuncFor(Invites));
  Meteor.publish('expenses', createAuthFuncForRoles(Expenses, ['admin', 'board', 'treasurer']));
  Meteor.publish('expenseAccounts', createAuthFuncForRoles(ExpenseAccounts, ['admin', 'board', 'treasurer']));
  Meteor.publish('groups', createAuthFuncFor(Groups));
  Meteor.publish('workshops', createAuthFuncFor(Workshops));
  Meteor.publish('groupMemberships', createAuthFuncFor(GroupMemberships));
  Meteor.publish('spaces', createAuthFuncFor(Spaces));
  Meteor.publish('storeItems', createAuthFuncFor(StoreItems));

  // Storage is deliberately published separately from the broad members
  // publication: treasurer-only users may see members for reimbursements, but
  // must not receive operational storage state or internal unit notes.
  Meteor.publish('storageAdminDashboard', async function () {
    if (!this.userId || !(await Roles.userIsInRoleAsync(this.userId, ['admin', 'board']))) {
      this.ready();
      return undefined;
    }
    return [
      StorageUnits.find(),
      StorageRequests.find(),
      StorageAssignments.find(),
      StorageWarnings.find(),
      StorageExemptions.find(),
      StorageMoves.find(),
      StorageNotificationDeliveries.find(),
      Members.find({}, { fields: { name: 1, mid: 1, email: 1, mobile: 1, lab: 1, infamily: 1 } }),
    ];
  });

  Meteor.publish('storageAdminHistory', async function (entityIds) {
    check(entityIds, [String]);
    if (!this.userId || !(await Roles.userIsInRoleAsync(this.userId, ['admin', 'board']))) {
      this.ready();
      return undefined;
    }
    if (entityIds.length > 20) throw new Meteor.Error('bad-request', 'Too many storage history entities');
    return StorageEvents.find({ entity_id: { $in: entityIds } }, { sort: { occurred_at: -1 }, limit: 500 });
  });

  Meteor.publish(null, async function () {
    if (this.userId) {
      if ((await Roles.userIsInRoleAsync(this.userId, 'admin'))) return Meteor.roleAssignment.find();
      return Meteor.roleAssignment.find({ 'user._id': this.userId });
    }
    this.ready();
  });
};
