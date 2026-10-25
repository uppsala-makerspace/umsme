import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import 'meteor/aldeed:collection2/static';
import { schemas } from '/imports/common/lib/schemas';

export const EventRegistrations = new Mongo.Collection('eventRegistrations');
EventRegistrations.attachSchema(schemas.eventRegistration);
// No allow rules: every write goes through methods
// (common/server/activities/registrations.js), in admin and the app alike.

if (Meteor.isServer) {
  Meteor.startup(async () => {
    try {
      await EventRegistrations.rawCollection().createIndex({ eventId: 1, memberId: 1 }, { unique: true });
      await EventRegistrations.rawCollection().createIndex({ memberId: 1 });
    } catch (e) {
      console.error('EventRegistrations index creation failed', e);
    }
  });
}
