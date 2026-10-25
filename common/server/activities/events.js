import { Meteor } from 'meteor/meteor';
import { Activities } from '/imports/common/collections/activities';
import { Events } from '/imports/common/collections/events';
import { Members } from '/imports/common/collections/members';
import { GroupMemberships } from '/imports/common/collections/groupMemberships';
import { recordChange } from '/imports/common/server/auditLog';
import { clearEntityImage } from '/imports/common/server/entityImage';
import { EVENT_STATUSES, disallowedHosts, eventEnd } from '/imports/common/lib/activityRules';
import { text } from '../groups/text';
import { sharedChanges, ownerGroupId, currentOf, imageActions } from './shared';

/**
 * Events: one time something happens, of an activity or free-standing
 * (plan/activities.md). An event of an activity has the activity's group,
 * kept on the event so that a group's events are one query; a free one has
 * its own group, or none for the association's. Who may write is the
 * caller's to check (mayBookEvent in common/lib/activityRules.js); these
 * functions keep the data whole, the hosts too, since that depends on who
 * asks: board and admin (`isAdminish`) may choose anyone, others only the
 * group's active members.
 */

const DOMAIN = 'events';

const isDate = (value) => value instanceof Date && !Number.isNaN(value.getTime());

const activeMemberIds = async (groupId) => (groupId
  ? (await GroupMemberships.find({ groupId, state: 'active' }, { fields: { memberId: 1 } }).fetchAsync()).map((m) => m.memberId)
  : []);

const changesOf = async (fields, { isAdminish }) => {
  const changes = await sharedChanges(fields, { inherit: true });
  const activityId = text(fields.activityId);
  const activity = activityId ? await Activities.findOneAsync(activityId) : null;
  if (activityId && !activity) throw new Meteor.Error('not-found', 'No such activity');
  if (!activity && !changes.$set.name?.sv) throw new Meteor.Error('bad-name', 'An event of no activity needs a Swedish name');
  const groupId = activity ? activity.groupId : await ownerGroupId(fields.groupId);

  if (!isDate(fields.start)) throw new Meteor.Error('bad-start', 'An event needs a start');
  const end = isDate(fields.end)
    ? fields.end
    : eventEnd(fields.start, changes.$set.durationMinutes ?? activity?.durationMinutes);
  if (!end) throw new Meteor.Error('bad-end', 'An event needs an end, or a duration to count it from');
  if (end <= fields.start) throw new Meteor.Error('bad-end', 'An event must end after it starts');

  const status = fields.status || 'confirmed';
  if (!EVENT_STATUSES.includes(status)) throw new Meteor.Error('bad-status', `Unknown status "${status}"`);

  const hostMemberIds = [...new Set((fields.hostMemberIds || []).map(text).filter(Boolean))];
  if (hostMemberIds.length && (await Members.find({ _id: { $in: hostMemberIds } }).countAsync()) !== hostMemberIds.length) {
    throw new Meteor.Error('not-found', 'No such member');
  }
  const outside = disallowedHosts({ hostMemberIds, groupMemberIds: await activeMemberIds(groupId), isAdminish });
  if (outside.length) throw new Meteor.Error('bad-host', 'Hosts must be active members of the group');

  Object.assign(changes.$set, { start: fields.start, end, status });
  for (const [field, value] of Object.entries({ activityId, groupId, hostMemberIds })) {
    if (value && value.length !== 0) changes.$set[field] = value; else changes.$unset[field] = '';
  }
  return changes;
};

export const currentEvent = currentOf(Events, 'event');

/** @returns {Promise<string>} the new event's id */
export const createEvent = async (fields, { userId, isAdminish }) => {
  const { $set } = await changesOf(fields, { isAdminish });
  const now = new Date();
  const doc = { ...$set, createdBy: userId, createdAt: now, updatedAt: now };
  const docId = await Events.insertAsync(doc);
  await recordChange({ userId, domain: DOMAIN, action: 'create', docId, after: doc });
  return docId;
};

/** Update an event, refused with 'conflict' if it changed since `expectedUpdatedAt`. */
export const updateEvent = async (docId, fields, { userId, isAdminish, expectedUpdatedAt }) => {
  const before = await currentEvent(docId, expectedUpdatedAt);
  const { $set, $unset } = await changesOf(fields, { isAdminish });
  $set.updatedAt = new Date();
  await Events.updateAsync(docId, Object.keys($unset).length ? { $set, $unset } : { $set });
  await recordChange({ userId, domain: DOMAIN, action: 'update', docId, before, after: await Events.findOneAsync(docId) });
};

/** Remove an event, and its image with it: an event is soon past, unlike an activity. */
export const removeEvent = async (docId, { userId }) => {
  const before = await currentEvent(docId);
  await clearEntityImage(Events, before);
  await Events.removeAsync(docId);
  await recordChange({ userId, domain: DOMAIN, action: 'remove', docId, before });
};

export const { setImage: setEventImage, removeImage: removeEventImage } = imageActions(Events, DOMAIN, 'event');
