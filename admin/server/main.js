import { Meteor } from 'meteor/meteor';
import '/imports/common/collections/users';
import '/imports/common/server/familyCascade';
import './cronjob';
import './methods';
import './api/certificatesRfid';
import './api/expenseReceipt';
import './api/workshopImage';
import '/imports/tabular/index';
import adminAvailable from './adminAvailable';
import publications from './publications';
import setupAccounts from './accounts';
import runMigrations from './migrations';

Meteor.startup(async () => {
  await adminAvailable();
  await setupAccounts();
  await runMigrations();
  publications();
});