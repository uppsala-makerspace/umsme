import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import 'meteor/aldeed:collection2/static';
import { schemas } from '/imports/common/lib/schemas';

export const Spaces = new Mongo.Collection('spaces');
Spaces.attachSchema(schemas.space);
// No allow rules: admin writes through the spaces.* methods
// (common/server/spaces/spaces.js), the app only reads, through methods.

if (Meteor.isServer) {
  Meteor.startup(async () => {
    // The map keys (SVG ids) are unique per floor, not globally — e.g.
    // "kitchen" exists on both floors. Drop the earlier too-strict global
    // index if present, then enforce uniqueness per (floor, spaceId).
    try {
      await Spaces.rawCollection().dropIndex('spaceId_1');
    } catch (e) {
      // index does not exist — fine
    }
    try {
      await Spaces.rawCollection().createIndex({ floor: 1, spaceId: 1 }, { unique: true });
    } catch (e) {
      console.error('Spaces index creation failed', e);
    }
  });
}
