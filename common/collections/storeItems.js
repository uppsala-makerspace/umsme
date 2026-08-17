import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import 'meteor/aldeed:collection2/static';
import { schemas } from '/imports/common/lib/schemas';
import { allow } from './allow';

export const StoreItems = new Mongo.Collection('storeItems');
StoreItems.attachSchema(schemas.storeItem);
allow(StoreItems);

// The role-based deny rules live in ./storeItemsDeny, imported by admin and the
// app. They need `meteor/roles`, which the payment service does not have — and
// payment needs this collection (to name the item in a receipt) without also
// needing a package it has no clients to police.

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
