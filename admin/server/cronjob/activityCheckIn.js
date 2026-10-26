import { Meteor } from 'meteor/meteor';
import { SyncedCron } from 'meteor/chatra:synced-cron';
import { sendCheckInReminders, sendCheckInLastCalls, passCheckInDeadlines } from '/imports/common/server/activities/registrations';

/**
 * Check-in for events (plan/activities.md, stage 3): remind those with a seat
 * when check-in opens, and again shortly before it closes, and when the deadline passes give the seats of those
 * who did not check in to the queue. Messages go to members, so it runs only
 * when `activityCron.enabled` is explicitly true in settings, like the
 * membership reminders: a development copy of the members never gets them.
 */
export const runActivityCheckInJob = async (now = new Date()) => {
  if (Meteor.settings?.activityCron?.enabled !== true) return 'Activity check-in disabled (activityCron.enabled is not true)';
  const reminded = await sendCheckInReminders(now);
  const lastCalls = await sendCheckInLastCalls(now);
  const missed = await passCheckInDeadlines(now);
  return `Reminded ${reminded} to check in, ${lastCalls} again; ${missed} missed the deadline`;
};

if (Meteor.isServer) {
  SyncedCron.add({
    name: 'Activity check-in reminders and deadlines',
    schedule: (parser) => parser.recur().every(10).minute(),
    job: () => runActivityCheckInJob(),
  });
}
