// Payment Callback Service - Main Entry Point
import { Meteor } from 'meteor/meteor';
import '/imports/common/collections/initiatedPayments';
import '/imports/common/collections/payments';
import '/imports/common/collections/members';
import '/imports/common/collections/memberships';
import '/imports/common/collections/messages';
import '/imports/common/collections/templates';
import '/imports/common/collections/pushSubs';
import '/imports/common/server/familyCascade';
import '/imports/common/server/storage/membershipSync';
import './api/swish';
import './api/status';
import { initPush } from '/imports/common/server/push';
import { ensureStorageIndexes } from '/imports/common/server/storageIndexes';

if (Meteor.settings.private?.mailUrl) {
  process.env.MAIL_URL = Meteor.settings.private.mailUrl;
}

Meteor.startup(async () => {
  await ensureStorageIndexes();
  initPush();
});

console.log('Payment callback service started');
