import { Meteor } from 'meteor/meteor';
import { StoreItems } from '/imports/common/collections/storeItems';
import { Payments } from '/imports/common/collections/payments';
import { Workshops } from '/imports/common/collections/workshops';
import { recordChange } from '/imports/common/server/auditLog';

/**
 * Web shop items. The app sells the available ones (common/lib/storeRules.js
 * decides the price and who may buy); the payment app records a purchase as
 * a payment carrying the item. Images go through the adminStoreItems.*Image
 * methods.
 */

const DOMAIN = 'storeItems';

const text = (value) => (typeof value === 'string' ? value.trim() : '');
const bilingual = (value) => {
  const sv = text(value?.sv);
  const en = text(value?.en);
  return sv || en ? { ...(sv ? { sv } : {}), ...(en ? { en } : {}) } : null;
};

/** Workshop ids that exist, without duplicates; refused if any does not. */
const knownWorkshops = async (ids = []) => {
  const unique = [...new Set(ids)];
  const known = await Workshops.find({ _id: { $in: unique } }, { fields: { _id: 1 } }).countAsync();
  if (known !== unique.length) throw new Meteor.Error('not-found', 'No such workshop');
  return unique;
};

/**
 * The fields the form edits, split into what to set and what to clear.
 * workshopIds: the workshops and areas of interest whose steering groups see
 * the item's sales.
 */
const changesOf = async (fields) => {
  const $set = {
    code: text(fields.code),
    name: { sv: text(fields.name?.sv), ...(text(fields.name?.en) ? { en: text(fields.name.en) } : {}) },
    bookkeepingAccount: text(fields.bookkeepingAccount),
    requiresMembership: !!fields.requiresMembership,
    commentRequired: !!fields.commentRequired,
    status: fields.status || 'available',
  };
  const $unset = {};
  const workshopIds = await knownWorkshops(fields.workshopIds);
  if (workshopIds.length) $set.workshopIds = workshopIds; else $unset.workshopIds = '';
  for (const field of ['description', 'commentPlaceholder']) {
    const value = bilingual(fields[field]);
    if (value) $set[field] = value; else $unset[field] = '';
  }
  for (const field of ['price', 'minPrice', 'maxPrice', 'sortOrder']) {
    if (typeof fields[field] === 'number' && !Number.isNaN(fields[field])) $set[field] = fields[field];
    else $unset[field] = '';
  }
  return { $set, $unset };
};

const uniqueCode = async (code, exceptId) => {
  if (await StoreItems.findOneAsync({ code, ...(exceptId ? { _id: { $ne: exceptId } } : {}) })) {
    throw new Meteor.Error('duplicate-code', `Another item already has the code "${code}"`);
  }
};

/** @returns {Promise<string>} the new item's id */
export const createStoreItem = async (fields, { userId }) => {
  const { $set } = await changesOf(fields);
  await uniqueCode($set.code);
  const now = new Date();
  const doc = { ...$set, createdAt: now, updatedAt: now };
  const docId = await StoreItems.insertAsync(doc);
  await recordChange({ userId, domain: DOMAIN, action: 'create', docId, after: doc });
  return docId;
};

const current = async (docId, expectedUpdatedAt) => {
  const before = await StoreItems.findOneAsync(docId);
  if (!before) throw new Meteor.Error('not-found', 'No such store item');
  if (expectedUpdatedAt !== undefined
      && (before.updatedAt?.getTime() ?? null) !== (expectedUpdatedAt?.getTime() ?? null)) {
    throw new Meteor.Error('conflict', 'Someone else changed this item; reload it and try again');
  }
  return before;
};

/** Update an item, refused with 'conflict' if it changed since `expectedUpdatedAt`. */
export const updateStoreItem = async (docId, fields, { userId, expectedUpdatedAt }) => {
  const before = await current(docId, expectedUpdatedAt);
  const { $set, $unset } = await changesOf(fields);
  await uniqueCode($set.code, docId);
  $set.updatedAt = new Date();
  await StoreItems.updateAsync(docId, Object.keys($unset).length ? { $set, $unset } : { $set });
  await recordChange({ userId, domain: DOMAIN, action: 'update', docId, before, after: await StoreItems.findOneAsync(docId) });
};

/** How often the item has been bought, and for how much. */
export const storeItemSales = async (docId) => {
  const payments = await Payments.find({ storeItem: docId }, { fields: { amount: 1 } }).fetchAsync();
  return { count: payments.length, total: payments.reduce((sum, { amount }) => sum + (amount || 0), 0) };
};

/**
 * Remove an item. Refused when it has an image (remove that first, or its
 * file is orphaned) or has been bought: payments pointing at a missing item
 * break the purchase history and the bookkeeping export. Hide it instead.
 */
export const removeStoreItem = async (docId, { userId }) => {
  const before = await current(docId);
  if (before.imageFileId) throw new Meteor.Error('has-image', 'Remove the image before the item can be deleted');
  if (await Payments.findOneAsync({ storeItem: docId })) {
    throw new Meteor.Error('bought', 'This item has been bought; set its status to hidden instead');
  }
  await StoreItems.removeAsync(docId);
  await recordChange({ userId, domain: DOMAIN, action: 'remove', docId, before });
};
