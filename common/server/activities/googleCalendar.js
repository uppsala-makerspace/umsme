import { Meteor } from 'meteor/meteor';
import { serviceAccountClient } from '/imports/common/server/googleServiceAccount';

/**
 * The association's Google calendar, as admin reads it (calendarImport.js) and
 * writes it (calendarSync.js): `private.googleCalendar` in admin's settings,
 * `{ calendarId, credentials | keyFile, location }` with the service account
 * given as for `googleDrive`, or "fake" for an in-memory stand-in (demo and
 * e2e). The service account reaches the calendar because the calendar is
 * shared with it ("Make changes to events"), so the calendar need not be
 * public.
 */

const SCOPE = 'https://www.googleapis.com/auth/calendar.events';

export const calendarSettings = () => Meteor.settings?.private?.googleCalendar;

/** Whether a calendar is configured, to import from and write to. */
export const calendarConfigured = () => {
  const settings = calendarSettings();
  return settings === 'fake' || !!(settings?.calendarId && (settings.credentials || settings.keyFile));
};

/** The URL of the calendar's events. */
export const eventsUrl = (settings) =>
  `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(settings.calendarId)}/events`;

let client;
let clientFor;

/** A request to the Calendar API as the service account; answers with the response. */
export const calendarRequest = (settings, opts) => {
  if (!client || clientFor !== settings) {
    client = serviceAccountClient(settings, [SCOPE], 'googleCalendar');
    clientFor = settings;
  }
  return client.request(opts);
};
