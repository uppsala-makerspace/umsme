import { StorageEvents } from '/imports/common/collections/storage';

export const storageEventDocument = ({
  id,
  entityType,
  entityId,
  eventType,
  actorType,
  actor,
  occurredAt = new Date(),
  reason,
  details,
}) => ({
  ...(id ? { _id: id } : {}),
  entity_type: entityType,
  entity_id: entityId,
  event_type: eventType,
  actor_type: actorType,
  ...(actor ? { actor } : {}),
  occurred_at: occurredAt,
  ...(reason ? { reason } : {}),
  ...(details ? { details } : {}),
});

export const appendStorageEvent = async (input, { session } = {}) => {
  const doc = storageEventDocument(input);
  if (doc._id) {
    const existing = session
      ? await StorageEvents.rawCollection().findOne({ _id: doc._id }, { session })
      : await StorageEvents.findOneAsync(doc._id);
    if (existing) return existing._id;
  }
  if (session) {
    const result = await StorageEvents.rawCollection().insertOne(doc, { session });
    return result.insertedId;
  }
  return StorageEvents.insertAsync(doc);
};
