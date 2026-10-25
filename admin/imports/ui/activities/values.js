import { day } from '../dates';

/**
 * An activity's or event's form values, and the fields a save sends, from
 * and to them. Meteor-free, so that the stories use them too.
 */

const pad = (n) => String(n).padStart(2, '0');

/** HH:MM, local time; '' for none. */
export const clock = (date) => (date ? `${pad(date.getHours())}:${pad(date.getMinutes())}` : '');

/**
 * A time typed by hand, 18:00, 18.00, 1800 or 18: written HH:MM; '' for
 * nothing; null for something that is no time.
 */
export const parseClock = (text) => {
  const value = (text || '').trim();
  if (!value) return '';
  const m = value.match(/^(\d{1,2})(?:[:.]?(\d{2}))?$/);
  if (!m) return null;
  const [h, min] = [Number(m[1]), Number(m[2] || 0)];
  return h < 24 && min < 60 ? `${pad(h)}:${pad(min)}` : null;
};

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
});

/** The form's values for an activity, or empty ones for a new one (of `groupId`). */
export const activityValues = (activity, { groupId = '' } = {}) => ({
  ...sharedValues(activity),
  groupId: activity ? activity.groupId || '' : groupId,
  membersOnly: activity ? !!activity.membersOnly : true,
  published: !!activity?.published,
});

export const activityFields = (v) => ({
  ...sharedFields(v),
  groupId: v.groupId || null,
  membersOnly: !!v.membersOnly,
  published: !!v.published,
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
});

/** The form's values for a category. */
export const categoryValues = (category) => ({ ...bilingual(category, 'name'), sortOrder: numberText(category?.sortOrder) });

export const categoryFields = (v) => ({ name: pair(v, 'name'), sortOrder: number(v.sortOrder) });

/** An event's name: its own, or its activity's. */
export const eventName = (event, activity) => event?.name?.sv || activity?.name?.sv || '';
