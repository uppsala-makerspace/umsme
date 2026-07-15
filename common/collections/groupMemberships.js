import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import 'meteor/aldeed:collection2/static';
import { Roles } from 'meteor/roles';
import { schemas } from '/imports/common/lib/schemas';
import { allow } from './allow';

export const GroupMemberships = new Mongo.Collection('groupMemberships');
GroupMemberships.attachSchema(schemas.groupMembership);
allow(GroupMemberships);

// Client writes are admin/board-only: membership rows carry approval state
// and (via linkedRole groups) drive role assignments, so a member-app client
// must not edit them directly. Join/approve flows go through server methods.
GroupMemberships.deny({
  async insert(userId) {
    return !userId || !(await Roles.userIsInRoleAsync(userId, ['admin', 'board']));
  },
  async update(userId) {
    return !userId || !(await Roles.userIsInRoleAsync(userId, ['admin', 'board']));
  },
  async remove(userId) {
    return !userId || !(await Roles.userIsInRoleAsync(userId, ['admin', 'board']));
  },
});

if (Meteor.isServer) {
  Meteor.startup(async () => {
    try {
      await GroupMemberships.rawCollection().createIndex(
        { groupId: 1, memberId: 1 },
        { unique: true }
      );
      await GroupMemberships.rawCollection().createIndex({ memberId: 1, state: 1 });
    } catch (e) {
      console.error('GroupMemberships index creation failed', e);
    }
  });
}
