import { Meteor } from 'meteor/meteor';
import { Activities } from '/imports/common/collections/activities';
import { Events } from '/imports/common/collections/events';
import { recordChange } from '/imports/common/server/auditLog';
import { EVENT_BOOKERS } from '/imports/common/lib/activityRules';
import { sharedChanges, ownerGroupId, currentOf, imageActions } from './shared';

/**
 * Activities: something we usually do, owned by a group or, without one, by
 * the association (plan/activities.md). Its events are the times it happens.
 * Who may write is the caller's to check (mayEditActivity in
 * common/lib/activityRules.js, and mayBookEventOf for its events, which
 * `eventBookers` decides); these functions keep the data whole.
 */

const DOMAIN = 'activities';

const changesOf = async (fields) => {
  const changes = await sharedChanges(fields, { inherit: false });
  if (!changes.$set.name?.sv) throw new Meteor.Error('bad-name', 'An activity needs a Swedish name');
  const eventBookers = fields.eventBookers || 'groupMembers';
  if (!EVENT_BOOKERS.includes(eventBookers)) throw new Meteor.Error('bad-value', `Unknown event bookers "${eventBookers}"`);
  changes.$set.eventBookers = eventBookers;
  const groupId = await ownerGroupId(fields.groupId);
  if (groupId) changes.$set.groupId = groupId; else changes.$unset.groupId = '';
  return changes;
};

export const currentActivity = currentOf(Activities, 'activity');

/** @returns {Promise<string>} the new activity's id */
export const createActivity = async (fields, { userId }) => {
  const { $set } = await changesOf(fields);
  const now = new Date();
  const doc = { ...$set, createdBy: userId, createdAt: now, updatedAt: now };
  const docId = await Activities.insertAsync(doc);
  await recordChange({ userId, domain: DOMAIN, action: 'create', docId, after: doc });
  return docId;
};

/**
 * Update an activity, refused with 'conflict' if it changed since
 * `expectedUpdatedAt`. Its events follow it to a new group.
 */
export const updateActivity = async (docId, fields, { userId, expectedUpdatedAt }) => {
  const before = await currentActivity(docId, expectedUpdatedAt);
  const { $set, $unset } = await changesOf(fields);
  $set.updatedAt = new Date();
  await Activities.updateAsync(docId, Object.keys($unset).length ? { $set, $unset } : { $set });
  if ((before.groupId || null) !== ($set.groupId || null)) {
    await Events.updateAsync(
      { activityId: docId },
      $set.groupId ? { $set: { groupId: $set.groupId } } : { $unset: { groupId: '' } },
      { multi: true },
    );
  }
  await recordChange({ userId, domain: DOMAIN, action: 'update', docId, before, after: await Activities.findOneAsync(docId) });
};

/** Remove an activity; refused while it has an image or events. */
export const removeActivity = async (docId, { userId }) => {
  const before = await currentActivity(docId);
  if (before.imageFileId) throw new Meteor.Error('has-image', 'Remove the image before the activity can be deleted');
  if (await Events.find({ activityId: docId }).countAsync()) {
    throw new Meteor.Error('in-use', 'The activity can not be deleted while it has events');
  }
  await Activities.removeAsync(docId);
  await recordChange({ userId, domain: DOMAIN, action: 'remove', docId, before });
};

export const { setImage: setActivityImage, removeImage: removeActivityImage } = imageActions(Activities, DOMAIN, 'activity');
