import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import 'meteor/aldeed:collection2/static';
import { schemas } from '/imports/common/lib/schemas';

export const ActivityInterests = new Mongo.Collection('activityInterests');
ActivityInterests.attachSchema(schemas.activityInterest);
// No allow rules: every write goes through methods
// (common/server/activities/registrations.js).

if (Meteor.isServer) {
  Meteor.startup(async () => {
    try {
      await ActivityInterests.rawCollection().createIndex({ activityId: 1, memberId: 1 }, { unique: true });
    } catch (e) {
      console.error('ActivityInterests index creation failed', e);
    }
  });
}
