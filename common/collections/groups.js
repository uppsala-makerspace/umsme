import { Mongo } from 'meteor/mongo';
import 'meteor/aldeed:collection2/static';
import { Roles } from 'meteor/roles';
import { schemas } from '/imports/common/lib/schemas';
import { allow } from './allow';
import { Workshops } from './workshops';
import { GroupMemberships } from './groupMemberships';
import { ExpenseAccounts } from './expenseAccounts';

export const Groups = new Mongo.Collection('groups');
Groups.attachSchema(schemas.group);
allow(Groups);

// Client writes are admin/board-only (stricter than the shared allow()):
// groups drive role assignments via linkedRole and approval authority via
// responsibleMemberId, so a member-app client must not be able to edit them
// directly over DDP. Member-facing flows go through server methods.
const notAdminish = async (userId) =>
  !userId || !(await Roles.userIsInRoleAsync(userId, ['admin', 'board']));

// The resulting value of a field after applying an update modifier, for deny
// rules that must validate the post-update document.
const nextValue = (doc, modifier, field) => {
  if (modifier.$set && field in modifier.$set) return modifier.$set[field];
  if (modifier.$unset && field in modifier.$unset) return undefined;
  return doc[field];
};

// Cross-field/cross-document rules the schema cannot express:
// - linkedRole must never be 'admin' (bootstrap-managed, see adminAvailable.js)
//   and a role-granting group must not be open to self-joining.
// - A responsibility group requires a parent, and a parent must be a workshop
//   group other than the group itself.
const violatesGroupRules = async ({ linkedRole, joinPolicy, type, parentGroupId }, selfId) => {
  if (linkedRole === 'admin') return true;
  if (linkedRole && joinPolicy === 'open') return true;
  if (type === 'responsibility' && !parentGroupId) return true;
  if (parentGroupId) {
    if (selfId && parentGroupId === selfId) return true;
    const parent = await Groups.findOneAsync(parentGroupId);
    if (!parent || parent.type !== 'workshop') return true;
  }
  return false;
};

Groups.deny({
  async insert(userId, doc) {
    // Insert callbacks get the full candidate document.
    return (await notAdminish(userId)) || violatesGroupRules(doc, null);
  },
  async update(userId, doc, fields, modifier) {
    if (await notAdminish(userId)) return true;
    // Meteor hands update/remove deny callbacks a doc containing only _id
    // (fields are only fetched when declared up front, which proved
    // unreliable), so read the current document ourselves.
    const current = (await Groups.findOneAsync(doc._id)) || doc;
    return violatesGroupRules(
      {
        linkedRole: nextValue(current, modifier, 'linkedRole'),
        joinPolicy: nextValue(current, modifier, 'joinPolicy'),
        type: nextValue(current, modifier, 'type'),
        parentGroupId: nextValue(current, modifier, 'parentGroupId'),
      },
      current._id
    );
  },
  // A group that anything still references must not be removable, and the
  // image must be removed first (its stored file would otherwise be orphaned —
  // deletion goes through the adminGroups.removeImage method).
  async remove(userId, doc) {
    if (await notAdminish(userId)) return true;
    const current = (await Groups.findOneAsync(doc._id)) || doc;
    if (current.imageFileId) return true;
    const referenced =
      (await Workshops.findOneAsync({ groupId: doc._id })) ||
      (await GroupMemberships.findOneAsync({ groupId: doc._id })) ||
      (await ExpenseAccounts.findOneAsync({ groupIds: doc._id })) ||
      (await Groups.findOneAsync({ parentGroupId: doc._id }));
    return !!referenced;
  },
});
