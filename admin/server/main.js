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
import '/imports/tabular/index';
import adminAvailable from './adminAvailable';
import publications from './publications';

Meteor.startup(async () => {
  await adminAvailable();
  publications();
});