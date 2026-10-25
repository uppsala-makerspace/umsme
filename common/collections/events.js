import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import 'meteor/aldeed:collection2/static';
import { schemas } from '/imports/common/lib/schemas';

export const Events = new Mongo.Collection('events');
Events.attachSchema(schemas.event);
// No allow rules: every write goes through methods
// (common/server/activities/), in admin and the app alike.

if (Meteor.isServer) {
  Meteor.startup(async () => {
    try {
      await Events.rawCollection().createIndex({ activityId: 1 });
      await Events.rawCollection().createIndex({ groupId: 1 });
      await Events.rawCollection().createIndex({ start: 1 });
    } catch (e) {
      console.error('Events index creation failed', e);
    }
  });
}
