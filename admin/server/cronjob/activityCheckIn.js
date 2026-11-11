import { Meteor } from 'meteor/meteor';
import { SyncedCron } from 'meteor/chatra:synced-cron';
import { sendCheckInReminders, sendCheckInLastCalls, passCheckInDeadlines, sendEventReminders } from '/imports/common/server/activities/registrations';

/**
 * Reminders and check-in for events (plan/activities.md, stage 3): remind
 * those with a seat and the hosts 24 hours and two hours before; remind those
 * with a seat when check-in opens, and again shortly before it closes, and
 * when the deadline passes give the seats of those who did not check in to the
 * queue. Messages go to members, so it runs only
 * when `activityCron.enabled` is explicitly true in settings, like the
 * membership reminders: a development copy of the members never gets them.
 */
export const runActivityCheckInJob = async (now = new Date()) => {
  if (Meteor.settings?.activityCron?.enabled !== true) return 'Activity check-in disabled (activityCron.enabled is not true)';
  const reminded = await sendCheckInReminders(now);
  const lastCalls = await sendCheckInLastCalls(now);
  const missed = await passCheckInDeadlines(now);
  const reminders = await sendEventReminders(now);
  return `Reminded ${reminded} to check in, ${lastCalls} again; ${missed} missed the deadline; ${reminders} reminders before events`;
};

if (Meteor.isServer) {
  SyncedCron.add({
    name: 'Activity reminders, check-in and deadlines',
    schedule: (parser) => parser.recur().every(10).minute(),
    job: () => runActivityCheckInJob(),
  });
}
