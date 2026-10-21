import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { Members } from '/imports/common/collections/members';
import { MessageTemplates } from '/imports/common/collections/templates';
import { Messages } from '/imports/common/collections/messages';
import { Payments } from '/imports/common/collections/payments';
import { Comments } from '/imports/common/collections/comments';
import { LiabilityDocuments } from '/imports/common/collections/liabilityDocuments';
import { Certificates } from '/imports/common/collections/certificates';
import { Announcements } from '/imports/common/collections/announcements';
import { Expenses } from '/imports/common/collections/expenses';
import { ExpenseAccounts } from '/imports/common/collections/expenseAccounts';
import { ExpenseBudgets } from '/imports/common/collections/expenseBudgets';
import { Groups } from '/imports/common/collections/groups';
import { Workshops } from '/imports/common/collections/workshops';
import { GroupMemberships } from '/imports/common/collections/groupMemberships';
import { Spaces } from '/imports/common/collections/spaces';
import { StoreItems } from '/imports/common/collections/storeItems';
import {
  StorageWalls,
  StorageUnits,
  StorageRequests,
  StorageOffers,
  StorageEvents,
} from '/imports/common/collections/storage';
import { STORAGE_OPERATOR_ROLES } from '/imports/common/lib/storageRules';
import { hasRole, DOMAIN_ROLES } from '/imports/common/server/authz';


const createAuthFuncForRoles = (col, roles) => async function () {
  if (this.userId && (await Roles.userIsInRoleAsync(this.userId, roles))) {
    return col.find();
  }
  this.ready();
};

const createAuthFuncFor = (col) => createAuthFuncForRoles(col, ['admin', 'board']);

const isStorageOperator = async (userId) =>
  !!userId && Roles.userIsInRoleAsync(userId, STORAGE_OPERATOR_ROLES);

export default () => {
  // Treasurer included so a treasurer-only account can see member name + bank
  // details when reimbursing an expense.
  Meteor.publish('members', createAuthFuncForRoles(Members, ['admin', 'board', 'treasurer']));
  Meteor.publish('payments', createAuthFuncFor(Payments));
  Meteor.publish(null, createAuthFuncFor(Meteor.roles));

  // Storage is deliberately published separately from the broad members
  // publication: treasurer-only users may see members for reimbursements, but
  // must not receive operational storage state or internal unit notes.
  Meteor.publish('storageAdminDashboard', async function () {
    if (!(await isStorageOperator(this.userId))) {
      this.ready();
      return undefined;
    }
    return [
      StorageWalls.find(),
      StorageUnits.find(),
      StorageRequests.find(),
      StorageOffers.find(),
      Messages.find({ type: 'storage' }),
      Members.find({}, { fields: { name: 1, mid: 1, email: 1, mobile: 1, lab: 1, infamily: 1 } }),
      // profile.name only: the event log falls back to it, and the rest of
      // profile holds an admin's personal number.
      Meteor.users.find({}, { fields: { 'emails.address': 1, 'profile.name': 1 } }),
    ];
  });

  Meteor.publish('storageAdminHistory', async function (entityIds) {
    check(entityIds, [String]);
    if (!(await isStorageOperator(this.userId))) {
      this.ready();
      return undefined;
    }
    if (entityIds.length > 20) throw new Meteor.Error('bad-request', 'Too many storage history entities');
    return StorageEvents.find({
      $or: [
        { entity_id: { $in: entityIds } },
        { unit: { $in: entityIds } },
        { related_unit: { $in: entityIds } },
      ],
    }, { sort: { occurred_at: -1 } });
  });

  Meteor.publish('storageAdminEventLog', async function (filters = {}) {
    check(filters, {
      member_id: Match.Maybe(String),
      unit_id: Match.Maybe(String),
    });
    if (!(await isStorageOperator(this.userId))) {
      this.ready();
      return undefined;
    }
    const memberId = filters.member_id || undefined;
    const unitId = filters.unit_id || undefined;
    const clauses = [];
    if (memberId) clauses.push({ member: memberId });
    if (unitId) clauses.push({ $or: [{ unit: unitId }, { related_unit: unitId }, { entity_id: unitId }] });
    return StorageEvents.find(clauses.length ? { $and: clauses } : {}, { sort: { occurred_at: -1 } });
  });

  // Narrow publications, one per view (plan/migration.md): the list gets
  // only what it shows, the document view the one document.
  Meteor.publish('admin.liability.list', async function () {
    if (!(await hasRole(this.userId, DOMAIN_ROLES.liability))) return this.ready();
    return LiabilityDocuments.find({}, { fields: { title: 1, date: 1 }, sort: { date: -1 } });
  });

  Meteor.publish('admin.liability.document', async function (docId) {
    check(docId, String);
    if (!(await hasRole(this.userId, DOMAIN_ROLES.liability))) return this.ready();
    return LiabilityDocuments.find(docId);
  });

  Meteor.publish('admin.messageTemplates.list', async function () {
    if (!(await hasRole(this.userId, DOMAIN_ROLES.messageTemplates))) return this.ready();
    return MessageTemplates.find({}, {
      fields: { name: 1, type: 1, membershiptype: 1, membertype: 1, deprecated: 1, auto: 1 },
    });
  });

  Meteor.publish('admin.messageTemplates.template', async function (docId) {
    check(docId, String);
    if (!(await hasRole(this.userId, DOMAIN_ROLES.messageTemplates))) return this.ready();
    return MessageTemplates.find(docId);
  });

  Meteor.publish('admin.storeItems.list', async function () {
    if (!(await hasRole(this.userId, DOMAIN_ROLES.storeItems))) return this.ready();
    return StoreItems.find({}, {
      fields: { code: 1, name: 1, price: 1, minPrice: 1, maxPrice: 1, requiresMembership: 1, bookkeepingAccount: 1, status: 1, workshopIds: 1 },
    });
  });

  Meteor.publish('admin.storeItems.item', async function (docId) {
    check(docId, String);
    if (!(await hasRole(this.userId, DOMAIN_ROLES.storeItems))) return this.ready();
    return StoreItems.find(docId);
  });

  // The workshops an item can be linked to: names only.
  Meteor.publish('admin.storeItems.workshops', async function () {
    if (!(await hasRole(this.userId, DOMAIN_ROLES.storeItems))) return this.ready();
    return Workshops.find({}, { fields: { name: 1, kind: 1 } });
  });

  Meteor.publish('admin.spaces.list', async function () {
    if (!(await hasRole(this.userId, DOMAIN_ROLES.spaces))) return this.ready();
    return Spaces.find({}, { fields: { spaceId: 1, floor: 1, name: 1, iconSize: 1, iconFileId: 1 } });
  });

  Meteor.publish('admin.spaces.space', async function (docId) {
    check(docId, String);
    if (!(await hasRole(this.userId, DOMAIN_ROLES.spaces))) return this.ready();
    return Spaces.find(docId);
  });

  Meteor.publish('admin.groups.list', async function () {
    if (!(await hasRole(this.userId, DOMAIN_ROLES.groups))) return this.ready();
    return Groups.find({}, { fields: { name: 1, type: 1, allowJoinRequests: 1, joinPolicy: 1, responsibleMemberId: 1, slackChannel: 1, description: 1 } });
  });

  Meteor.publish('admin.groups.group', async function (docId) {
    check(docId, String);
    if (!(await hasRole(this.userId, DOMAIN_ROLES.groups))) return this.ready();
    return Groups.find(docId);
  });

  // A group's memberships; the pages look the names up with adminMembers.names.
  Meteor.publish('admin.groups.memberships', async function (groupId) {
    check(groupId, String);
    if (!(await hasRole(this.userId, DOMAIN_ROLES.groups))) return this.ready();
    return GroupMemberships.find({ groupId });
  });

  Meteor.publish('admin.workshops.list', async function () {
    if (!(await hasRole(this.userId, DOMAIN_ROLES.workshops))) return this.ready();
    return Workshops.find({}, { fields: { name: 1, kind: 1, status: 1, groupId: 1 } });
  });

  Meteor.publish('admin.workshops.workshop', async function (docId) {
    check(docId, String);
    if (!(await hasRole(this.userId, DOMAIN_ROLES.workshops))) return this.ready();
    return Workshops.find(docId);
  });

  // The certificates, with what the list shows and what choosing a
  // prerequisite needs (each one's own prerequisites, to keep out cycles).
  Meteor.publish('admin.certificates.list', async function () {
    if (!(await hasRole(this.userId, DOMAIN_ROLES.certificates))) return this.ready();
    return Certificates.find({}, { fields: { name: 1, workshopId: 1, mandatory: 1, defaultValidityDays: 1, certifierRole: 1, prerequisites: 1, test: 1 } });
  });

  Meteor.publish('admin.certificates.certificate', async function (docId) {
    check(docId, String);
    if (!(await hasRole(this.userId, DOMAIN_ROLES.certificates))) return this.ready();
    return Certificates.find(docId);
  });

  Meteor.publish('admin.announcements.list', async function () {
    if (!(await hasRole(this.userId, DOMAIN_ROLES.announcements))) return this.ready();
    return Announcements.find({}, { fields: { type: 1, subjectSv: 1, status: 1, createdAt: 1, sentAt: 1 } });
  });

  Meteor.publish('admin.announcements.announcement', async function (docId) {
    check(docId, String);
    if (!(await hasRole(this.userId, DOMAIN_ROLES.announcements))) return this.ready();
    return Announcements.find(docId);
  });

  // Expense accounts with what the list, the choices and the dimension
  // suggestions need; one account; its budgets; one expense.
  Meteor.publish('admin.expenseAccounts.list', async function () {
    if (!(await hasRole(this.userId, DOMAIN_ROLES.expenses))) return this.ready();
    return ExpenseAccounts.find({}, { fields: { name: 1, explanation: 1, groupIds: 1, approverMemberIds: 1, approverGroupIds: 1, dimensions: 1 } });
  });

  Meteor.publish('admin.expenseAccounts.account', async function (docId) {
    check(docId, String);
    if (!(await hasRole(this.userId, DOMAIN_ROLES.expenses))) return this.ready();
    return ExpenseAccounts.find(docId);
  });

  Meteor.publish('admin.expenseBudgets.ofAccount', async function (accountId) {
    check(accountId, String);
    if (!(await hasRole(this.userId, DOMAIN_ROLES.expenses))) return this.ready();
    return ExpenseBudgets.find({ expenseAccountId: accountId });
  });

  Meteor.publish('admin.expenses.expense', async function (docId) {
    check(docId, String);
    if (!(await hasRole(this.userId, DOMAIN_ROLES.expenses))) return this.ready();
    return Expenses.find(docId);
  });

  // The comments about one thing: a member, a payment, a mail…
  Meteor.publish('admin.comments.about', async function (about) {
    check(about, String);
    if (!(await hasRole(this.userId, DOMAIN_ROLES.comments))) return this.ready();
    return Comments.find({ about });
  });

  // The messages sent to a member, or about a membership, without their text.
  Meteor.publish('admin.messages.of', async function (about) {
    check(about, Match.OneOf({ member: String }, { membership: String }));
    if (!(await hasRole(this.userId, DOMAIN_ROLES.messages))) return this.ready();
    return Messages.find(about, { fields: { member: 1, membership: 1, type: 1, subject: 1, senddate: 1, payment: 1 } });
  });

  // What the group and workshop pages link to and choose among: names, and
  // what decides which choices make sense (a group's type, a workshop's group).
  // The treasurer sees the names too, on the expense accounts.
  Meteor.publish('admin.groupsAndWorkshops.choices', async function () {
    if (!(await hasRole(this.userId, [...new Set([...DOMAIN_ROLES.groups, ...DOMAIN_ROLES.expenses])]))) return this.ready();
    return [
      Groups.find({}, { fields: { name: 1, type: 1, parentGroupId: 1 } }),
      Workshops.find({}, { fields: { name: 1, kind: 1, groupId: 1 } }),
      Spaces.find({}, { fields: { name: 1, floor: 1, spaceId: 1 } }),
    ];
  });

  Meteor.publish(null, async function () {
    if (this.userId) {
      if ((await Roles.userIsInRoleAsync(this.userId, 'admin'))) return Meteor.roleAssignment.find();
      return Meteor.roleAssignment.find({ 'user._id': this.userId });
    }
    this.ready();
  });
};
