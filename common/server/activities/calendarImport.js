import { Meteor } from 'meteor/meteor';
import { fetch } from 'meteor/fetch';
import { Activities } from '/imports/common/collections/activities';
import { Events } from '/imports/common/collections/events';
import { Spaces } from '/imports/common/collections/spaces';
import { createEvent } from './events';
import { normalizedName } from './linking';
import { zonedDate } from '/imports/common/lib/days';

/**
 * Importing the association's Google calendar as events: each calendar event
 * once (by its id, kept as the event's googleEventId), free-standing, or of
 * the activity that has its name. Nobody is told of an imported event.
 *
 * The calendar is `private.googleCalendar` in admin's settings, `{ apiKey,
 * calendarId }` as the app's public one, or "fake" for a stand-in calendar
 * of a few events around today (demo and e2e).
 */

const DAY = 86400000;

/** The fake calendar: a weekly evening, a cleaning day and an all-day fair, around `now`. */
const fakeItems = (now) => {
  const at = (days, hour, minutes = 0) => {
    const d = new Date(now.getTime() + days * DAY);
    d.setHours(hour, minutes, 0, 0);
    return d.toISOString();
  };
  const weekly = [-21, -14, -7, 7, 14].map((days) => ({
    id: `fake-oppen-kvall-${days}`, summary: 'Öppen kväll',
    description: 'Kom och bygg <b>tillsammans</b>.', location: 'Stora rummet',
    start: { dateTime: at(days, 18) }, end: { dateTime: at(days, 21) },
  }));
  const fairDay = new Date(now.getTime() + 21 * DAY);
  const day = (d) => d.toISOString().slice(0, 10);
  return [
    ...weekly,
    { id: 'fake-staddag', summary: 'Städdag i lokalen', start: { dateTime: at(10, 10) }, end: { dateTime: at(10, 15) } },
    { id: 'fake-massa', summary: 'Makermässa', start: { date: day(fairDay) }, end: { date: day(new Date(fairDay.getTime() + DAY)) } },
  ];
};

const calendarSettings = () => Meteor.settings?.private?.googleCalendar;

/** Whether a calendar is configured to import from. */
export const calendarConfigured = () => {
  const settings = calendarSettings();
  return settings === 'fake' || !!(settings?.apiKey && settings?.calendarId);
};

/** The calendar's raw events between two moments, every page of them. */
const fetchItems = async (from, to) => {
  const settings = calendarSettings();
  if (settings === 'fake') {
    return fakeItems(new Date()).filter((item) => new Date(item.end.dateTime || item.end.date) > from && new Date(item.start.dateTime || item.start.date) < to);
  }
  if (!settings?.apiKey || !settings?.calendarId) throw new Meteor.Error('not-configured', 'No calendar is configured (private.googleCalendar)');
  const items = [];
  let pageToken = null;
  do {
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(settings.calendarId)}/events`
      + `?key=${encodeURIComponent(settings.apiKey)}&singleEvents=true&orderBy=startTime&maxResults=250`
      + `&timeMin=${encodeURIComponent(from.toISOString())}&timeMax=${encodeURIComponent(to.toISOString())}`
      + (pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : '');
    const response = await fetch(url);
    if (!response.ok) throw new Meteor.Error('calendar-failed', `The calendar answered ${response.status}`);
    const page = await response.json();
    items.push(...(page.items || []));
    pageToken = page.nextPageToken || null;
  } while (pageToken && items.length < 2000);
  return items;
};

// An all-day event is a day, at midnight Swedish time; its end is the day after.
const moment = (value) => {
  if (value.dateTime) return new Date(value.dateTime);
  const [y, m, d] = value.date.split('-').map(Number);
  return zonedDate(y, m - 1, d);
};

const plainText = (html) => (html || '')
  .replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n').replace(/<[^>]+>/g, '')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/\n{3,}/g, '\n\n').trim();

/** A calendar event as an event's fields would have it. */
const toEvent = (item) => ({
  googleEventId: item.id,
  name: (item.summary || '').trim(),
  description: plainText(item.description),
  location: (item.location || '').trim(),
  start: moment(item.start),
  end: moment(item.end),
  allDay: !item.start.dateTime,
});

/**
 * What the calendar has between two days, each with whether it is imported
 * already, the activity with its name and the space with its location.
 */
export const calendarPreview = async ({ from, to }) => {
  const items = (await fetchItems(from, to)).filter((item) => item.status !== 'cancelled').map(toEvent);
  const imported = new Map((await Events.find({ googleEventId: { $in: items.map((i) => i.googleEventId) } }, { fields: { googleEventId: 1 } }).fetchAsync())
    .map((e) => [e.googleEventId, e._id]));
  const activities = await Activities.find({}, { fields: { name: 1 } }).fetchAsync();
  const spaces = await Spaces.find({}, { fields: { name: 1 } }).fetchAsync();
  const activityFor = (name) => activities.find((a) => [a.name?.sv, a.name?.en].map(normalizedName).includes(normalizedName(name)));
  const spaceFor = (location) => spaces.find((s) => [s.name?.sv, s.name?.en].map(normalizedName).includes(normalizedName(location)));
  return items.map((item) => ({
    ...item,
    eventId: imported.get(item.googleEventId) || null,
    activityId: activityFor(item.name)?._id || null,
    activityName: activityFor(item.name)?.name || null,
    spaceId: item.location ? spaceFor(item.location)?._id || null : null,
  }));
};

/**
 * Import the chosen calendar events: those not imported yet become events,
 * of the activity with their name or free-standing in the association.
 *
 * @returns {Promise<{ created: number, skipped: number }>}
 */
export const importCalendarEvents = async ({ from, to, googleEventIds }, { userId }) => {
  const chosen = new Set(googleEventIds);
  let created = 0;
  let skipped = 0;
  for (const item of await calendarPreview({ from, to })) {
    if (!chosen.has(item.googleEventId)) continue;
    if (item.eventId || !item.name) {
      skipped += 1;
      continue;
    }
    await createEvent({
      // Of an activity it says what the activity says; free-standing, what the calendar does.
      ...(item.activityId ? { activityId: item.activityId } : {
        name: { sv: item.name },
        ...(item.description ? { description: { sv: item.description } } : {}),
      }),
      ...(item.spaceId ? { spaceId: item.spaceId } : {}),
      start: item.start,
      end: item.end,
      googleEventId: item.googleEventId,
    }, { userId, isAdminish: true, announce: false });
    created += 1;
  }
  return { created, skipped };
};
