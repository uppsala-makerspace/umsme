import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import 'meteor/aldeed:collection2/static';
import { schemas } from '/imports/common/lib/schemas';

export const Workshops = new Mongo.Collection('workshops');
Workshops.attachSchema(schemas.workshop);
// No allow rules: admin writes through the workshops.* methods
// (common/server/workshops/workshops.js); the app only reads, through methods.

if (Meteor.isServer) {
  Meteor.startup(async () => {
    try {
      await Workshops.rawCollection().createIndex({ groupId: 1 });
    } catch (e) {
      console.error('Workshops index creation failed', e);
    }
  });
}
