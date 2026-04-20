// Payment Callback Service - Main Entry Point
import { Meteor } from 'meteor/meteor';
import '/imports/common/collections/initiatedPayments';
import '/imports/common/collections/payments';
import '/imports/common/collections/members';
import '/imports/common/collections/memberships';
import '/imports/common/collections/messages';
import '/imports/common/collections/templates';
import './api/swish';
import './cronjob/expireInitiatedPayments';

if (Meteor.settings.private?.mailUrl) {
  process.env.MAIL_URL = Meteor.settings.private.mailUrl;
}

console.log('Payment callback service started');
