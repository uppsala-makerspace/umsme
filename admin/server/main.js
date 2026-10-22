import { Meteor } from 'meteor/meteor';
import '/imports/common/collections/users';
import '/imports/common/server/familyCascade';
import '/imports/common/server/storage/membershipSync';
import './cronjob';
import './methods';
import './api/certificatesRfid';
import './api/expenseReceipt';
import './api/workshopImage';
import './api/publicDirectory';
import adminAvailable from './adminAvailable';
import publications from './publications';
import setupAccounts from './accounts';
import runMigrations from './migrations';
import { runSeedFromEnv } from '/imports/common/server/seed/runFromEnv';
import { ensureStorageIndexes } from '/imports/common/server/storageIndexes';
import { ensureAuditLogIndexes } from '/imports/common/server/auditLog';
import { ensureStorageMessageTemplates } from '/imports/common/server/storageMessages/defaults';
import { applyMailUrlFromSettings } from '/imports/common/server/mailUrl';
import { setUpMails } from './mail/mails';

applyMailUrlFromSettings();

Meteor.startup(async () => {
  const seedSummary = await runSeedFromEnv();
  await adminAvailable();
  await setupAccounts();
  await ensureStorageIndexes();
  await ensureAuditLogIndexes();
  await setUpMails();
  await ensureStorageMessageTemplates();
  await runMigrations();
  publications();
  if (seedSummary) console.log(seedSummary().map((line) => `[seed] ${line}`).join('\n'));
});
