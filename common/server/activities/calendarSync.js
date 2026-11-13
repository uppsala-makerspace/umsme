import { Meteor } from 'meteor/meteor';
import crypto from 'crypto';
import { Activities } from '/imports/common/collections/activities';
import { Events } from '/imports/common/collections/events';
import { Workshops } from '/imports/common/collections/workshops';
import { CalendarRemovals } from '/imports/common/collections/calendarRemovals';
import { resolveEvent } from '/imports/common/lib/activityRules';
import { calendarEntry } from '/imports/common/lib/calendarEntry';
import { appBaseUrl } from '/imports/common/lib/links';
import { serviceAccountClient } from '/imports/common/server/googleServiceAccount';

/**
 * Events mirrored to the association's Google calendar (plan/activities.md,
 * stage 4). Not by catching every change, which also comes through an
 * activity an event inherits from, but by reconciling: what each recent event
 * should say in the calendar (calendarEntry) is hashed and compared with the
 * hash of what was last written, and only what differs is written. A failed
 * write leaves the hash as it was, so the next run tries again. Removed
 * events leave their calendar event in CalendarRemovals.
 *
 * UMSME touches only the calendar events of its own events: those it created
 * and those it imported (googleEventId), whatever is changed in Google.
 *
 * The calendar is admin's `private.googleCalendar`: `{ calendarId,
 * credentials | keyFile, location }`, the service account given as for
 * `googleDrive`, or "fake" for an in-memory stand-in (demo and e2e).
 */

const DAY = 86400000;
const SCOPE = 'https://www.googleapis.com/auth/calendar.events';

const calendarSettings = () => Meteor.settings?.private?.googleCalendar;

/** Whether the service account that writes is given: inline or as a key file. */
const hasServiceAccount = (settings) => !!(settings?.credentials || settings?.keyFile);

/** Whether a calendar is configured to write to. */
export const calendarSyncConfigured = () => {
  const settings = calendarSettings();
  return settings === 'fake' || !!(settings?.calendarId && hasServiceAccount(settings));
};

// The calendar event is gone from Google: write it anew, or count it removed.
const gone = (error) => [404, 410].includes(error?.response?.status ?? error?.status);

const googleTransport = (settings) => {
  let client;
  const request = (opts) => {
    client = client || serviceAccountClient(settings, [SCOPE], 'googleCalendar');
    return client.request(opts);
  };
  const events = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(settings.calendarId)}/events`;
  return {
    insert: async (body) => (await request({ url: events, method: 'POST', data: body })).data.id,
    update: async (id, body) => { await request({ url: `${events}/${encodeURIComponent(id)}`, method: 'PUT', data: body }); },
    remove: async (id) => { await request({ url: `${events}/${encodeURIComponent(id)}`, method: 'DELETE' }); },
  };
};

/** The stand-in calendar: what would have been written, by calendar event id. */
export const fakeCalendar = new Map();
let fakeIds = 0;
const fakeTransport = {
  insert: async (body) => {
    fakeIds += 1;
    const id = `umsme-fake-${fakeIds}`;
    fakeCalendar.set(id, body);
    console.log(`[calendar] (fake) insert ${id}: ${body.summary}`);
    return id;
  },
  update: async (id, body) => {
    fakeCalendar.set(id, body);
    console.log(`[calendar] (fake) update ${id}: ${body.summary}`);
  },
  remove: async (id) => {
    fakeCalendar.delete(id);
    console.log(`[calendar] (fake) remove ${id}`);
  },
};

let transportOverride;
const transport = () => transportOverride || (calendarSettings() === 'fake' ? fakeTransport : googleTransport(calendarSettings()));

/** Replace the calendar in tests: `{ insert, update, remove }`, or null for the configured one. */
export const setCalendarTransportForTests = (value) => {
  transportOverride = value;
};

export const calendarHash = (entry) => crypto.createHash('sha1').update(JSON.stringify(entry)).digest('hex');

const byId = async (collection, ids) => {
  const docs = ids.length ? await collection.find({ _id: { $in: [...new Set(ids)] } }).fetchAsync() : [];
  return new Map(docs.map((d) => [d._id, d]));
};

/** Bring one event's calendar event in step with what it should say. Returns what was done. */
const syncEvent = async (calendar, event, entry) => {
  if (!entry) {
    if (!event.googleEventId) return null;
    try {
      await calendar.remove(event.googleEventId);
    } catch (error) {
      if (!gone(error)) throw error;
    }
    await Events.updateAsync(event._id, { $unset: { googleEventId: '', calendarHash: '', calendarError: '' } });
    return 'removed';
  }
  const hash = calendarHash(entry);
  if (event.googleEventId && event.calendarHash === hash && !event.calendarError) return null;
  let googleEventId = event.googleEventId;
  let done = 'updated';
  if (googleEventId) {
    try {
      await calendar.update(googleEventId, entry);
    } catch (error) {
      if (!gone(error)) throw error;
      googleEventId = null;
    }
  }
  if (!googleEventId) {
    googleEventId = await calendar.insert(entry);
    done = 'created';
  }
  await Events.updateAsync(event._id, { $set: { googleEventId, calendarHash: hash }, $unset: { calendarError: '' } });
  return done;
};

/**
 * Reconcile the calendar with the events: those that ended within the last
 * week or are still to come, and the removed ones. Each failure is logged and
 * kept on its event as calendarError, and stops none of the others.
 *
 * @returns {Promise<{ created: number, updated: number, removed: number, failed: number }>}
 */
export const syncCalendar = async (now = new Date()) => {
  const counts = { created: 0, updated: 0, removed: 0, failed: 0 };
  const calendar = transport();
  const settings = calendarSettings();
  const where = { address: (typeof settings === 'object' && settings?.location) || '', appUrl: appBaseUrl() };

  const events = await Events.find({ end: { $gte: new Date(now.getTime() - 7 * DAY) } }).fetchAsync();
  const activities = await byId(Activities, events.map((e) => e.activityId).filter(Boolean));
  const resolved = events.map((e) => resolveEvent(e, activities.get(e.activityId)));
  const workshops = await byId(Workshops, resolved.map((e) => e.workshopId).filter(Boolean));
  for (const [i, event] of events.entries()) {
    const entry = calendarEntry(resolved[i], { ...where, workshopName: workshops.get(resolved[i].workshopId)?.name?.sv || '' });
    try {
      const done = await syncEvent(calendar, event, entry);
      if (done) counts[done] += 1;
    } catch (error) {
      counts.failed += 1;
      console.error(`[calendar] event ${event._id} failed: ${error.message}`);
      await Events.updateAsync(event._id, { $set: { calendarError: String(error.message).slice(0, 1000) } });
    }
  }

  for (const removal of await CalendarRemovals.find().fetchAsync()) {
    try {
      await calendar.remove(removal.googleEventId);
    } catch (error) {
      if (!gone(error)) {
        counts.failed += 1;
        console.error(`[calendar] removing ${removal.googleEventId} failed: ${error.message}`);
        continue;
      }
    }
    await CalendarRemovals.removeAsync(removal._id);
    counts.removed += 1;
  }
  return counts;
};
