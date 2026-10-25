import { Meteor } from 'meteor/meteor';
import { Activities } from '/imports/common/collections/activities';
import { Events } from '/imports/common/collections/events';
import { recordChange } from '/imports/common/server/auditLog';
import { SHARED_FIELDS } from '/imports/common/lib/activityRules';
import { createActivity } from './activities';

/**
 * Tying free-standing events to activities: making an activity of an event,
 * and finding the free-standing events with an activity's name to take in,
 * such as those imported from the calendar before the activity existed.
 */

/** A name to compare: no case, no surrounding or doubled spaces. */
export const normalizedName = (text) => (text || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('sv');

const namesOf = (doc) => [doc?.name?.sv, doc?.name?.en].map(normalizedName).filter(Boolean);

/** Whether an event goes by the activity's name, in either language. */
export const sameName = (event, activity) => {
  const wanted = namesOf(activity);
  return namesOf(event).some((name) => wanted.includes(name));
};

const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/**
 * Link a free-standing event to an activity: it takes the activity's group,
 * and what it says as the activity does is left to the activity (its name
 * when it is the same name), so that changing the activity changes it too.
 */
const linkEvent = async (event, activity, { userId }) => {
  const $set = { activityId: activity._id, updatedAt: new Date() };
  if (activity.groupId) $set.groupId = activity.groupId;
  const $unset = {};
  if (!activity.groupId) $unset.groupId = '';
  for (const field of SHARED_FIELDS) {
    if (event[field] === undefined) continue;
    if (field === 'name' ? sameName(event, activity) : same(event[field], activity[field])) $unset[field] = '';
  }
  await Events.updateAsync(event._id, Object.keys($unset).length ? { $set, $unset } : { $set });
  await recordChange({ userId, domain: 'events', action: 'linkToActivity', docId: event._id, before: event, after: await Events.findOneAsync(event._id) });
};

/**
 * Make an activity of a free-standing event: the activity gets what the
 * event says (its name, description, place, registration…), its group, and
 * a duration from its length; the event becomes the activity's first.
 *
 * @returns {Promise<string>} the activity's id
 */
export const createActivityFromEvent = async (eventId, { userId }) => {
  const event = await Events.findOneAsync(eventId);
  if (!event) throw new Meteor.Error('not-found', 'No such event');
  if (event.activityId) throw new Meteor.Error('linked', 'The event already belongs to an activity');
  const fields = Object.fromEntries(SHARED_FIELDS.filter((f) => event[f] !== undefined).map((f) => [f, event[f]]));
  const activityId = await createActivity({
    ...fields,
    groupId: event.groupId || null,
    durationMinutes: event.durationMinutes || Math.round((event.end - event.start) / 60000),
    // Images belong to the event; the activity gets its own.
    imageFileId: undefined,
    imageMimeType: undefined,
  }, { userId });
  await linkEvent(event, await Activities.findOneAsync(activityId), { userId });
  return activityId;
};

/** The free-standing events with an activity's name, latest first. */
export const matchingEvents = async (activityId) => {
  const activity = await Activities.findOneAsync(activityId);
  if (!activity) throw new Meteor.Error('not-found', 'No such activity');
  const free = await Events.find({ activityId: { $exists: false } }, { sort: { start: -1 } }).fetchAsync();
  return free.filter((event) => sameName(event, activity));
};

/** Link free-standing events to an activity; returns how many were. */
export const linkEvents = async (activityId, eventIds, { userId }) => {
  const activity = await Activities.findOneAsync(activityId);
  if (!activity) throw new Meteor.Error('not-found', 'No such activity');
  let linked = 0;
  for (const event of await Events.find({ _id: { $in: eventIds }, activityId: { $exists: false } }).fetchAsync()) {
    await linkEvent(event, activity, { userId });
    linked += 1;
  }
  return linked;
};
