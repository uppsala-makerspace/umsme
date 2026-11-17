import { Meteor } from 'meteor/meteor';
import { Categories } from '/imports/common/collections/categories';
import { Activities } from '/imports/common/collections/activities';
import { Events } from '/imports/common/collections/events';
import { Groups } from '/imports/common/collections/groups';
import { Workshops } from '/imports/common/collections/workshops';
import { recordChange } from '/imports/common/server/auditLog';
import { slugify } from '/imports/common/lib/slug';
import { text } from './groups/text';
import { currentOf } from './activities/shared';

/**
 * The categories, the public website's filter: a list board and admin keep.
 * Groups, workshops and areas of interest may have several, activities and
 * events one. The slug is the category's id on the website.
 */

const DOMAIN = 'categories';
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const changesOf = async (fields, docId = null) => {
  const sv = text(fields.name?.sv);
  if (!sv) throw new Meteor.Error('bad-name', 'A category needs a Swedish name');
  const en = text(fields.name?.en);
  const sortOrder = fields.sortOrder;
  if (sortOrder !== undefined && sortOrder !== null && !Number.isInteger(sortOrder)) {
    throw new Meteor.Error('bad-value', 'The sort order must be a whole number');
  }
  // Left empty, the slug comes from the Swedish name.
  const slug = text(fields.slug) || slugify(sv);
  if (!SLUG.test(slug) || slug.length > 60) {
    throw new Meteor.Error('bad-slug', 'The slug may only have lowercase letters a–z, digits and single hyphens');
  }
  if (await Categories.findOneAsync({ slug, _id: { $ne: docId } }, { fields: { _id: 1 } })) {
    throw new Meteor.Error('slug-taken', `Another category already has the slug "${slug}"`);
  }
  const changes = { $set: { name: { sv, ...(en ? { en } : {}) }, slug }, $unset: {} };
  if (Number.isInteger(sortOrder)) changes.$set.sortOrder = sortOrder; else changes.$unset.sortOrder = '';
  return changes;
};

export const currentCategory = currentOf(Categories, 'category');

/**
 * Category ids as a group or a workshop stores them: each one must exist,
 * duplicates dropped. Null when there are none, so the field is unset.
 */
export const categoryIdsOf = async (ids) => {
  const unique = [...new Set((ids || []).map(text).filter(Boolean))];
  if (unique.length === 0) return null;
  const found = await Categories.find({ _id: { $in: unique } }, { fields: { _id: 1 } }).countAsync();
  if (found !== unique.length) throw new Meteor.Error('not-found', 'No such category');
  return unique;
};

/** @returns {Promise<string>} the new category's id */
export const createCategory = async (fields, { userId }) => {
  const { $set } = await changesOf(fields);
  const doc = { ...$set, updatedAt: new Date() };
  const docId = await Categories.insertAsync(doc);
  await recordChange({ userId, domain: DOMAIN, action: 'create', docId, after: doc });
  return docId;
};

/** Update a category, refused with 'conflict' if it changed since `expectedUpdatedAt`. */
export const updateCategory = async (docId, fields, { userId, expectedUpdatedAt }) => {
  const before = await currentCategory(docId, expectedUpdatedAt);
  const { $set, $unset } = await changesOf(fields, docId);
  $set.updatedAt = new Date();
  await Categories.updateAsync(docId, Object.keys($unset).length ? { $set, $unset } : { $set });
  await recordChange({ userId, domain: DOMAIN, action: 'update', docId, before, after: await Categories.findOneAsync(docId) });
};

/** How many activities, events, groups and workshops have the category. */
export const categoryUsage = async (docId) =>
  (await Activities.find({ categoryId: docId }).countAsync())
  + (await Events.find({ categoryId: docId }).countAsync())
  + (await Groups.find({ categoryIds: docId }).countAsync())
  + (await Workshops.find({ categoryIds: docId }).countAsync());

/** Remove a category; refused while anything has it. */
export const removeCategory = async (docId, { userId }) => {
  const before = await currentCategory(docId);
  if (await categoryUsage(docId)) {
    throw new Meteor.Error('in-use', 'The category can not be deleted while activities, events, groups or workshops have it');
  }
  await Categories.removeAsync(docId);
  await recordChange({ userId, domain: DOMAIN, action: 'remove', docId, before });
};
