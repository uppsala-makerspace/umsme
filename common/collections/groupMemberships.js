import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import 'meteor/aldeed:collection2/static';
import { schemas } from '/imports/common/lib/schemas';

export const GroupMemberships = new Mongo.Collection('groupMemberships');
GroupMemberships.attachSchema(schemas.groupMembership);
// No allow rules: admin writes through the groups.* methods
// (common/server/groups/groups.js), the app through its own join flows.

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
