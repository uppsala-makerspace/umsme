import { Meteor } from 'meteor/meteor';
import { schemas } from '/imports/common/lib/schemas';
import { StorageConflictError } from './errors';

export const validateStorageDocument = (schema, document) => {
  const context = schema.newContext();
  const { _id, ...fields } = document;
  if (!context.validate(fields)) {
    const errors = typeof context.validationErrors === 'function'
      ? context.validationErrors()
      : (typeof context.invalidKeys === 'function' ? context.invalidKeys() : []);
    const detail = errors.map((key) => `${key.name}:${key.type}`).join(', ');
    throw new Error(`Invalid storage document: ${detail}`);
  }
  return document;
};

// Every storage write runs inside runStorageAtomic. A missing session is a
// programming error, not a mode to fall back to.
const requireSession = (session) => {
  if (!session) throw new Error('Storage writes must run inside runStorageAtomic');
  return session;
};

export const insertStorageDocument = async (collection, schema, document, { session } = {}) => {
  validateStorageDocument(schema, document);
  const result = await collection.rawCollection().insertOne(document, { session: requireSession(session) });
  return result.insertedId;
};

export const casStorageUpdate = async (collection, selector, modifier, { session } = {}) => {
  const result = await collection.rawCollection().updateOne(selector, modifier, { session: requireSession(session) });
  if (result.matchedCount !== 1) throw new StorageConflictError();
};

/** The allowed keys of `fields` that were actually submitted. */
export const pickDefined = (fields, keys) =>
  Object.fromEntries(keys.filter((key) => fields[key] !== undefined).map((key) => [key, fields[key]]));

/**
 * Split submitted changes into $set and $unset. A blank value for one of the
 * `blankable` keys removes the field instead of storing an empty string.
 */
export const splitSetUnset = (changes, blankable = []) => {
  const $set = {};
  const $unset = {};
  for (const [key, value] of Object.entries(changes)) {
    if (blankable.includes(key) && !value) $unset[key] = '';
    else $set[key] = value;
  }
  return { $set, $unset };
};

/** A modifier that only carries $unset when there is something to unset. */
export const setUnsetModifier = ($set, $unset) =>
  ({ $set, ...(Object.keys($unset).length ? { $unset } : {}) });

export const requireFutureDate = (value, now, message) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date <= now) throw new Meteor.Error('bad-date', message);
  return date;
};

export const STORAGE_SCHEMAS = {
  wall: schemas.storageWall,
  unit: schemas.storageUnit,
  request: schemas.storageRequest,
  offer: schemas.storageOffer,
};
