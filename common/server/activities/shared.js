import { Meteor } from 'meteor/meteor';
import { Groups } from '/imports/common/collections/groups';
import { Workshops } from '/imports/common/collections/workshops';
import { Spaces } from '/imports/common/collections/spaces';
import { ActivityCategories } from '/imports/common/collections/activityCategories';
import { setEntityImage, clearEntityImage } from '/imports/common/server/entityImage';
import { recordChange } from '/imports/common/server/auditLog';
import { text, bilingual, setOrUnset } from '../groups/text';

/**
 * What activities and events share: their common fields (an event's override
 * its activity's, see common/lib/activityRules.js), the references in them,
 * the version check and the image.
 */

const exists = async (collection, id, what) => {
  if (id && !(await collection.findOneAsync(id, { fields: { _id: 1 } }))) {
    throw new Meteor.Error('not-found', `No such ${what}`);
  }
  return id;
};

const positive = (value, what, { integer = false } = {}) => {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || (integer && !Number.isInteger(value))) {
    throw new Meteor.Error('bad-value', `${what} must be a ${integer ? 'whole ' : ''}number of zero or more`);
  }
  return value;
};

/**
 * The shared fields as $set and $unset. On an activity a yes/no is always
 * stored; on an event null leaves it to the activity (`inherit`).
 */
export const sharedChanges = async (fields, { inherit }) => {
  const durationMinutes = positive(fields.durationMinutes, 'The duration', { integer: true });
  if (durationMinutes === 0) throw new Meteor.Error('bad-value', 'The duration must be at least a minute');
  const flag = (value) => (inherit && (value === undefined || value === null) ? null : !!value);
  const changes = { $set: {}, $unset: {} };
  setOrUnset(changes, {
    name: bilingual(fields.name),
    description: bilingual(fields.description),
    categoryId: await exists(ActivityCategories, text(fields.categoryId), 'category'),
    workshopId: await exists(Workshops, text(fields.workshopId), 'workshop'),
    spaceId: await exists(Spaces, text(fields.spaceId), 'space'),
    slackChannel: text(fields.slackChannel),
    contactEmail: text(fields.contactEmail),
    durationMinutes,
    cost: positive(fields.cost, 'The cost'),
    membersOnly: flag(fields.membersOnly),
    published: flag(fields.published),
  });
  return changes;
};

/** The owning group's id, checked to exist; '' for the association's. */
export const ownerGroupId = (value) => exists(Groups, text(value), 'group');

/** The document, refused with 'conflict' if it changed since `expectedUpdatedAt`. */
export const currentOf = (collection, what) => async (docId, expectedUpdatedAt) => {
  const before = await collection.findOneAsync(docId);
  if (!before) throw new Meteor.Error('not-found', `No such ${what}`);
  if (expectedUpdatedAt !== undefined
      && (before.updatedAt?.getTime() ?? null) !== (expectedUpdatedAt?.getTime() ?? null)) {
    throw new Meteor.Error('conflict', `Someone else changed this ${what}; reload it and try again`);
  }
  return before;
};

/** Setting and removing the image of an activity or an event, each a new version. */
export const imageActions = (collection, domain, what) => ({
  async setImage(docId, { imageBase64, mimeType }, { userId }) {
    const before = await collection.findOneAsync(docId);
    if (!before) throw new Meteor.Error('not-found', `No such ${what}`);
    const fileId = await setEntityImage(collection, before, { imageBase64, mimeType, baseName: `${what}-${docId}-${Date.now()}` });
    await collection.updateAsync(docId, { $set: { updatedAt: new Date() } });
    await recordChange({ userId, domain, action: 'uploadImage', docId, before, after: await collection.findOneAsync(docId) });
    return fileId;
  },
  async removeImage(docId, { userId }) {
    const before = await collection.findOneAsync(docId);
    if (!before) throw new Meteor.Error('not-found', `No such ${what}`);
    if (!before.imageFileId) return;
    await clearEntityImage(collection, before);
    await collection.updateAsync(docId, { $set: { updatedAt: new Date() } });
    await recordChange({ userId, domain, action: 'removeImage', docId, before, after: await collection.findOneAsync(docId) });
  },
});
