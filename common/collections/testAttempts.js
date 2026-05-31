import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import 'meteor/aldeed:collection2/static';
import { schemas } from '/imports/common/lib/schemas';
import { allow } from './allow';

export const TestAttempts = new Mongo.Collection('testAttempts');
TestAttempts.attachSchema(schemas.testAttempt);
allow(TestAttempts);

if (Meteor.isServer) {
  Meteor.startup(async () => {
    try {
      await TestAttempts.rawCollection().createIndex({ memberId: 1, certificateId: 1 });
    } catch (e) {
      console.error('TestAttempts index creation failed', e);
    }
  });
}
