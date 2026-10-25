/**
 * An activity's or event's form values, and the fields a save sends, from
 * and to them: the same in admin and the app. Pure, so that the stories use
 * them too.
 */

import { parseClock } from './days';

export { parseClock };

const pad = (n) => String(n).padStart(2, '0');

/** The day, YYYY-MM-DD, local time; '' for none. */
export const day = (date) => (date ? `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` : '');

/** HH:MM, local time; '' for none. */
export const clock = (date) => (date ? `${pad(date.getHours())}:${pad(date.getMinutes())}` : '');

/** The moment of a day (YYYY-MM-DD) and a time (HH:MM), local time; null unless both are whole. */
export const moment = (dayText, clockText) => {
  const time = parseClock(clockText);
  if (!dayText || !time) return null;
  const [y, mo, d] = dayText.split('-').map(Number);
  const [h, min] = time.split(':').map(Number);
  return new Date(y, mo - 1, d, h, min);
};

const bilingual = (doc, field) => ({ [`${field}Sv`]: doc?.[field]?.sv || '', [`${field}En`]: doc?.[field]?.en || '' });
const pair = (v, field) => ({ sv: v[`${field}Sv`], en: v[`${field}En`] });
const number = (text) => (String(text ?? '').trim() === '' ? null : Number(String(text).replace(',', '.')));
const numberText = (value) => (value === undefined || value === null ? '' : String(value));

// A yes/no of an event: '' leaves it to the activity.
const flagText = (value) => (value === true ? 'yes' : value === false ? 'no' : '');
const flagFrom = (text) => (text === 'yes' ? true : text === 'no' ? false : null);

const sharedValues = (doc) => ({
  ...bilingual(doc, 'name'),
  ...bilingual(doc, 'description'),
  categoryId: doc?.categoryId || '',
  workshopId: doc?.workshopId || '',
  spaceId: doc?.spaceId || '',
  slackChannel: doc?.slackChannel || '',
  contactEmail: doc?.contactEmail || '',
  durationMinutes: numberText(doc?.durationMinutes),
  cost: numberText(doc?.cost),
  minSeats: numberText(doc?.minSeats),
  maxSeats: numberText(doc?.maxSeats),
  infoPlaceholder: doc?.infoPlaceholder || '',
  requiredCertificateId: doc?.requiredCertificateId || '',
  checkInOpensHoursBefore: numberText(doc?.checkInOpensHoursBefore),
});

const sharedFields = (v) => ({
  name: pair(v, 'name'),
  description: pair(v, 'description'),
  categoryId: v.categoryId || null,
  workshopId: v.workshopId || null,
  spaceId: v.spaceId || null,
  slackChannel: v.slackChannel,
  contactEmail: v.contactEmail,
  durationMinutes: number(v.durationMinutes),
  cost: number(v.cost),
  minSeats: number(v.minSeats),
  maxSeats: number(v.maxSeats),
  infoPlaceholder: v.infoPlaceholder,
  requiredCertificateId: v.requiredCertificateId || null,
  checkInOpensHoursBefore: number(v.checkInOpensHoursBefore),
});

/** The form's values for an activity, or empty ones for a new one (of `groupId`). */
export const activityValues = (activity, { groupId = '' } = {}) => ({
  ...sharedValues(activity),
  groupId: activity ? activity.groupId || '' : groupId,
  membersOnly: activity ? !!activity.membersOnly : true,
  published: !!activity?.published,
  registration: activity?.registration || 'none',
  queueAllowed: !!activity?.queueAllowed,
  infoRequired: !!activity?.infoRequired,
  checkInEnabled: !!activity?.checkInEnabled,
  eventBookers: activity?.eventBookers || 'groupMembers',
});

export const activityFields = (v) => ({
  ...sharedFields(v),
  groupId: v.groupId || null,
  membersOnly: !!v.membersOnly,
  published: !!v.published,
  registration: v.registration,
  queueAllowed: !!v.queueAllowed,
  infoRequired: !!v.infoRequired,
  checkInEnabled: !!v.checkInEnabled,
  eventBookers: v.eventBookers,
});

/** The form's values for an event, or empty ones for a new one (of `activityId`). */
export const eventValues = (event, { activityId = '' } = {}) => ({
  ...sharedValues(event),
  activityId: event ? event.activityId || '' : activityId,
  groupId: event?.activityId ? '' : event?.groupId || '',
  startDay: day(event?.start),
  startTime: clock(event?.start),
  endDay: day(event?.end),
  endTime: clock(event?.end),
  hostMemberIds: event?.hostMemberIds || [],
  status: event?.status || 'confirmed',
  membersOnly: flagText(event?.membersOnly),
  published: flagText(event?.published),
  registration: event?.registration || '',
  queueAllowed: flagText(event?.queueAllowed),
  infoRequired: flagText(event?.infoRequired),
  checkInEnabled: flagText(event?.checkInEnabled),
  checkInDeadlineDay: day(event?.checkInDeadline),
  checkInDeadlineTime: clock(event?.checkInDeadline),
  googleEventId: event?.googleEventId || '',
});

/**
 * The fields of an event's save. Without an end time the end is counted from
 * the duration, the event's or its activity's.
 */
export const eventFields = (v) => ({
  ...sharedFields(v),
  activityId: v.activityId || null,
  groupId: v.activityId ? null : v.groupId || null,
  start: moment(v.startDay, v.startTime),
  end: moment(v.endDay || v.startDay, v.endTime),
  hostMemberIds: v.hostMemberIds,
  status: v.status,
  membersOnly: flagFrom(v.membersOnly),
  published: flagFrom(v.published),
  registration: v.registration || null,
  queueAllowed: flagFrom(v.queueAllowed),
  infoRequired: flagFrom(v.infoRequired),
  checkInEnabled: flagFrom(v.checkInEnabled),
  checkInDeadline: moment(v.checkInDeadlineDay || v.startDay, v.checkInDeadlineTime),
  googleEventId: v.googleEventId || null,
});

/** The form's values for a category. */
export const categoryValues = (category) => ({ ...bilingual(category, 'name'), sortOrder: numberText(category?.sortOrder) });

export const categoryFields = (v) => ({ name: pair(v, 'name'), sortOrder: number(v.sortOrder) });

/** An event's name: its own, or its activity's. */
export const eventName = (event, activity) => event?.name?.sv || activity?.name?.sv || '';
