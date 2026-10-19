import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import 'meteor/aldeed:collection2/static';
import { schemas } from '/imports/common/lib/schemas';

export const StoreItems = new Mongo.Collection('storeItems');
StoreItems.attachSchema(schemas.storeItem);
// No allow rules: admin writes through the storeItems.* methods
// (common/server/storeItems/items.js), the app and payment only read.

if (Meteor.isServer) {
  Meteor.startup(async () => {
    try {
      // The code is the item's public identity: it goes in the Swish message and
      // is how the app looks an item up, so it has to be unique.
      await StoreItems.rawCollection().createIndex({ code: 1 }, { unique: true });
    } catch (e) {
      console.error('StoreItems index creation failed', e);
    }
  });
}
