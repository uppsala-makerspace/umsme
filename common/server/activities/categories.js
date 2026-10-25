import { Meteor } from 'meteor/meteor';
import { ActivityCategories } from '/imports/common/collections/activityCategories';
import { Activities } from '/imports/common/collections/activities';
import { Events } from '/imports/common/collections/events';
import { recordChange } from '/imports/common/server/auditLog';
import { text } from '../groups/text';
import { currentOf } from './shared';

/** The categories of activities, the website's filter: a list board and admin keep. */

const DOMAIN = 'activityCategories';

const changesOf = (fields) => {
  const sv = text(fields.name?.sv);
  if (!sv) throw new Meteor.Error('bad-name', 'A category needs a Swedish name');
  const en = text(fields.name?.en);
  const sortOrder = fields.sortOrder;
  if (sortOrder !== undefined && sortOrder !== null && !Number.isInteger(sortOrder)) {
    throw new Meteor.Error('bad-value', 'The sort order must be a whole number');
  }
  const changes = { $set: { name: { sv, ...(en ? { en } : {}) } }, $unset: {} };
  if (Number.isInteger(sortOrder)) changes.$set.sortOrder = sortOrder; else changes.$unset.sortOrder = '';
  return changes;
};

export const currentCategory = currentOf(ActivityCategories, 'category');

/** @returns {Promise<string>} the new category's id */
export const createCategory = async (fields, { userId }) => {
  const { $set } = changesOf(fields);
  const doc = { ...$set, updatedAt: new Date() };
  const docId = await ActivityCategories.insertAsync(doc);
  await recordChange({ userId, domain: DOMAIN, action: 'create', docId, after: doc });
  return docId;
};

/** Update a category, refused with 'conflict' if it changed since `expectedUpdatedAt`. */
export const updateCategory = async (docId, fields, { userId, expectedUpdatedAt }) => {
  const before = await currentCategory(docId, expectedUpdatedAt);
  const { $set, $unset } = changesOf(fields);
  $set.updatedAt = new Date();
  await ActivityCategories.updateAsync(docId, Object.keys($unset).length ? { $set, $unset } : { $set });
  await recordChange({ userId, domain: DOMAIN, action: 'update', docId, before, after: await ActivityCategories.findOneAsync(docId) });
};

/** Remove a category; refused while an activity or an event has it. */
export const removeCategory = async (docId, { userId }) => {
  const before = await currentCategory(docId);
  const used = (await Activities.find({ categoryId: docId }).countAsync()) + (await Events.find({ categoryId: docId }).countAsync());
  if (used) throw new Meteor.Error('in-use', 'The category can not be deleted while activities or events have it');
  await ActivityCategories.removeAsync(docId);
  await recordChange({ userId, domain: DOMAIN, action: 'remove', docId, before });
};
