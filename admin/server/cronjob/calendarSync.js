import { Meteor } from 'meteor/meteor';
import { SyncedCron } from 'meteor/chatra:synced-cron';
import { calendarSyncConfigured, syncCalendar } from '/imports/common/server/activities/calendarSync';

/**
 * Events mirrored to the Google calendar (plan/activities.md, stage 4). It
 * writes to the calendar everyone subscribes to, so it runs only when
 * `activityCron.enabled` is explicitly true, like the check-in job, and a
 * calendar to write to is configured: a development copy of the events never
 * reaches the real calendar.
 */
export const runCalendarSyncJob = async (now = new Date()) => {
  if (Meteor.settings?.activityCron?.enabled !== true) return 'Calendar sync disabled (activityCron.enabled is not true)';
  if (!calendarSyncConfigured()) return 'Calendar sync disabled (no private.googleCalendar.serviceAccount)';
  const { created, updated, removed, failed } = await syncCalendar(now);
  return `Calendar: ${created} created, ${updated} updated, ${removed} removed, ${failed} failed`;
};

if (Meteor.isServer) {
  SyncedCron.add({
    name: 'Activity calendar sync',
    schedule: (parser) => parser.recur().every(5).minute(),
    job: () => runCalendarSyncJob(),
  });
}
