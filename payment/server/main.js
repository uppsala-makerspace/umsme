// Payment Callback Service - Main Entry Point
import '/imports/common/collections/initiatedPayments';
import '/imports/common/collections/payments';
import '/imports/common/collections/members';
import '/imports/common/collections/memberships';
import './api/swish';
import './cronjob/expireInitiatedPayments';

console.log('Payment callback service started');
