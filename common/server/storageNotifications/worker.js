import { Meteor } from 'meteor/meteor';
import { processStorageNotificationQueue } from './service';

let timer;
let inFlight;

export const runStorageNotificationWorker = async () => {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      return await processStorageNotificationQueue();
    } catch (error) {
      console.error('[Storage notifications] Worker failed:', error);
      return 0;
    } finally {
      inFlight = undefined;
    }
  })();
  return inFlight;
};

export const startStorageNotificationWorker = () => {
  const config = Meteor.settings?.private?.storageNotifications?.worker;
  if (!config?.enabled || timer) return false;
  const intervalMs = Math.max(5_000, Number(config.intervalMs) || 30_000);
  Meteor.defer(runStorageNotificationWorker);
  timer = Meteor.setInterval(runStorageNotificationWorker, intervalMs);
  return true;
};

export const stopStorageNotificationWorkerForTests = () => {
  if (timer) Meteor.clearInterval(timer);
  timer = undefined;
  inFlight = undefined;
};
