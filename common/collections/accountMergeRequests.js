import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';

/**
 * A member's request to merge another account into their own
 * (app/server/methods/emails.js): the other account's email gets a link,
 * and opening it proves the mailbox, as a password reset would.
 * `{ fromUserId, toUserId, address, tokenHash, createdAt, expiresAt, usedAt?, outcome? }`.
 * Server only: no allow rules and no publication.
 */
export const AccountMergeRequests = new Mongo.Collection('accountMergeRequests');

if (Meteor.isServer) {
  Meteor.startup(async () => {
    await AccountMergeRequests.rawCollection().createIndex({ tokenHash: 1 }, { unique: true });
  });
}
