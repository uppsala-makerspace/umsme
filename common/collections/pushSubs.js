import { Mongo } from "meteor/mongo";
export const PushSubs = new Mongo.Collection("pushSubs");

if (Meteor.isServer) {
  Meteor.startup(() => {
    PushSubs.rawCollection().createIndex(
      { endpoint: 1 },
      { unique: true }
    );
  });
}
