/**
 * What an event says in the association's Google calendar (plan/activities.md,
 * stage 4): the body of the calendar event, or null when it is not to be
 * there. Pure, so that what the calendar shows is tested without Google.
 */

import { TIME_ZONE, zonedClock, zonedDay } from './days';

export const CANCELLED_PREFIX = 'INSTÄLLT: ';

const text = (pair, first = 'sv') => (pair?.[first] || pair?.[first === 'sv' ? 'en' : 'sv'] || '').trim();

// Midnight to midnight, Swedish time: a day (or days) of its own, as an all-day calendar event.
const allDay = (start, end) => zonedClock(start) === '00:00' && zonedClock(end) === '00:00' && end > start;

const when = (date, wholeDays) => (wholeDays ? { date: zonedDay(date) } : { dateTime: date.toISOString(), timeZone: TIME_ZONE });

/**
 * The calendar event of an event resolved against its activity. Only an event
 * shown on the website is in the calendar.
 *
 * @param {object} event - resolveEvent(event, activity)
 * @param {{ workshopName?: string, address?: string, appUrl?: string }} where
 *   The workshop's name and the association's address make up the place;
 *   the app's address gives the link to the event.
 * @returns {object|null}
 */
export const calendarEntry = (event, { workshopName = '', address = '', appUrl = '' } = {}) => {
  if (!event?.published) return null;
  const name = text(event.name);
  const sv = text(event.description);
  const en = (event.description?.en || '').trim();
  const link = appUrl ? `${appUrl.replace(/\/+$/, '')}/events/${event._id}` : '';
  const wholeDays = allDay(event.start, event.end);
  return {
    // Confirmed in Google's sense, also when called off: then it stays, marked in its title.
    status: 'confirmed',
    summary: `${event.status === 'cancelled' ? CANCELLED_PREFIX : ''}${name}`,
    description: [sv, en !== sv ? en : '', link].filter(Boolean).join('\n\n'),
    location: [workshopName, address].filter(Boolean).join(', '),
    start: when(event.start, wholeDays),
    end: when(event.end, wholeDays),
    extendedProperties: { private: { umsmeEventId: event._id } },
  };
};
