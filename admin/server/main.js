import { Meteor } from 'meteor/meteor';
import '/imports/common/collections/users';
import '/imports/common/server/familyCascade';
import './cronjob';
import './methods';
import './api/certificatesRfid';
import './api/expenseReceipt';
import '/imports/tabular/index';
import adminAvailable from './adminAvailable';
import publications from './publications';
import setupAccounts from './accounts';

Meteor.startup(async () => {
  await adminAvailable();
  await setupAccounts();
  publications();
});