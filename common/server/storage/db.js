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

export const insertStorageDocument = async (collection, schema, document, { session } = {}) => {
  validateStorageDocument(schema, document);
  if (session) {
    const result = await collection.rawCollection().insertOne(document, { session });
    return result.insertedId;
  }
  return collection.insertAsync(document);
};

export const casStorageUpdate = async (collection, selector, modifier, { session } = {}) => {
  if (session) {
    const result = await collection.rawCollection().updateOne(selector, modifier, { session });
    if (result.matchedCount !== 1) throw new StorageConflictError();
    return;
  }
  const affected = await collection.updateAsync(selector, modifier);
  if (affected !== 1) throw new StorageConflictError();
};

export const STORAGE_SCHEMAS = {
  unit: schemas.storageUnit,
  request: schemas.storageRequest,
  assignment: schemas.storageAssignment,
  warning: schemas.storageWarning,
  exemption: schemas.storageExemption,
  move: schemas.storageMove,
  delivery: schemas.storageNotificationDelivery,
  actionExecution: schemas.storageActionExecution,
};
