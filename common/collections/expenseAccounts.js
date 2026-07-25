import { Mongo } from 'meteor/mongo';
import 'meteor/aldeed:collection2/static';
import { Roles } from 'meteor/roles';
import { schemas } from '/imports/common/lib/schemas';
import { allow } from './allow';
import { Expenses } from './expenses';
import { GroupMemberships } from './groupMemberships';

export const ExpenseAccounts = new Mongo.Collection('expenseAccounts');
ExpenseAccounts.attachSchema(schemas.expenseAccount);
allow(ExpenseAccounts);

// Client writes are admin/board-only (stricter than the shared allow()): an
// account grants its groups' members the right to spend on it and names the
// approvers, so a member-app client must not edit them directly over DDP.
const notAdminish = async (userId) =>
  !userId || !(await Roles.userIsInRoleAsync(userId, ['admin', 'board']));

// The resulting value of an array field after applying an update modifier, for
// deny rules that must validate the post-update document. The admin UI edits
// approvers with $push/$pull, so those are applied the way the server will.
const nextArray = (doc, modifier, field) => {
  if (modifier.$set && field in modifier.$set) return modifier.$set[field] || [];
  if (modifier.$unset && field in modifier.$unset) return [];
  let value = doc[field] || [];
  const pushed = modifier.$push?.[field];
  if (pushed !== undefined) {
    value = value.concat(pushed?.$each ? pushed.$each : [pushed]);
  }
  const pulled = modifier.$pull?.[field];
  if (pulled !== undefined) {
    const removed = pulled?.$in ? pulled.$in : [pulled];
    value = value.filter((v) => !removed.includes(v));
  }
  return value;
};

// Every approver must be an active member of one of the account's groups: the
// guideline picks the expense approvers from the groups the account belongs to.
const approversOutsideGroups = async (groupIds, approverMemberIds) => {
  const approvers = [...new Set(approverMemberIds)];
  if (!approvers.length) return false;
  if (!groupIds.length) return true;
  const memberships = await GroupMemberships.find(
    { groupId: { $in: groupIds }, memberId: { $in: approvers }, state: 'active' },
    { fields: { memberId: 1 } }
  ).fetchAsync();
  const eligible = new Set(memberships.map((m) => m.memberId));
  return approvers.some((id) => !eligible.has(id));
};

ExpenseAccounts.deny({
  async insert(userId, doc) {
    // Insert callbacks get the full candidate document.
    if (await notAdminish(userId)) return true;
    return approversOutsideGroups(doc.groupIds || [], doc.approverMemberIds || []);
  },
  async update(userId, doc, fields, modifier) {
    if (await notAdminish(userId)) return true;
    // Meteor hands update/remove deny callbacks a doc containing only _id, so
    // read the current document ourselves.
    const current = (await ExpenseAccounts.findOneAsync(doc._id)) || doc;
    return approversOutsideGroups(
      nextArray(current, modifier, 'groupIds'),
      nextArray(current, modifier, 'approverMemberIds')
    );
  },
  // An account that has been used by any expense must not be removable.
  async remove(userId, doc) {
    if (await notAdminish(userId)) return true;
    const used = await Expenses.findOneAsync({ expenseAccountId: doc._id });
    return !!used;
  },
});
