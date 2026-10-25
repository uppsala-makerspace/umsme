import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import 'meteor/aldeed:collection2/static';
import { schemas } from '/imports/common/lib/schemas';

export const Activities = new Mongo.Collection('activities');
Activities.attachSchema(schemas.activity);
// No allow rules: every write goes through methods
// (common/server/activities/), in admin and the app alike.

if (Meteor.isServer) {
  Meteor.startup(async () => {
    try {
      await Activities.rawCollection().createIndex({ groupId: 1 });
    } catch (e) {
      console.error('Activities index creation failed', e);
    }
  });
}
