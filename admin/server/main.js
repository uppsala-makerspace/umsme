import { Meteor } from 'meteor/meteor';
import '/imports/common/collections/users';
import './cronjob/syncAndMailUnlocks';
import './cronjob/cleanupPendingAttestations';
import './methods/mail';
import './methods/lock';
import './methods/bank';
import './methods/check';
import './methods/update';
import './methods/admin';
import './methods/user';
import './methods/push';
import '/imports/tabular/index';
import adminAvailable from './adminAvailable';
import publications from './publications';
import setupAccounts from './accounts';

Meteor.startup(async () => {
  await adminAvailable();
  await setupAccounts();
  publications();
});