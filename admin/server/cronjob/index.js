import { SyncedCron } from 'meteor/chatra:synced-cron';

// Each module registers its job(s) via SyncedCron.add(...) at import time.
import './syncAndMailUnlocks';
import './cleanupPendingAttestations';
import './sendReminders';
import './notifyExpiring';

if (Meteor.isServer) {
  SyncedCron.start();
}
