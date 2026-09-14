import { StorageConflictError } from './errors';
import { insertStorageDocument } from './db';

const findOne = (collection, id, session) => session
  ? collection.rawCollection().findOne({ _id: id }, { session })
  : collection.findOneAsync(id);

export const ensureStorageDocument = async (collection, schema, document, { session, matches } = {}) => {
  const existing = await findOne(collection, document._id, session);
  if (existing) {
    if (matches && !matches(existing)) throw new StorageConflictError('Deterministic storage record conflicts');
    return document._id;
  }
  return insertStorageDocument(collection, schema, document, { session });
};

export const ensureStorageUpdate = async (
  collection, id, originalSelector, modifier, desired, { session } = {},
) => {
  const current = await findOne(collection, id, session);
  if (current && desired(current)) return;
  const selector = { _id: id, ...originalSelector };
  const result = session
    ? await collection.rawCollection().updateOne(selector, modifier, { session })
    : { matchedCount: await collection.updateAsync(selector, modifier) };
  if (result.matchedCount !== 1) throw new StorageConflictError();
};
