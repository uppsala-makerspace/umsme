import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import { StorageUnits, StorageRequests, StorageOffers, StorageEvents } from '/imports/common/collections/storage';
import { hasActiveLabMembershipAt } from '/imports/common/lib/storageRules';
import { appendStorageEvent } from './events';
import { casStorageUpdate, insertStorageDocument, STORAGE_SCHEMAS } from './db';
import { runStorageAtomic } from './atomic';
import { completeStorageOffer } from './commands';
import { reconcileStorageState } from './reconciliation';
import { storageOperationId } from './ids';

const cleanPreference = (preference) => {
  if (preference === undefined || preference === null) return undefined;
  if (typeof preference !== 'object' || Array.isArray(preference)) {
    throw new Meteor.Error('bad-preference', 'Preference must be an object');
  }
  const clean = {};
  if (preference.floor !== undefined) {
    if (!['floor1', 'floor2'].includes(preference.floor)) throw new Meteor.Error('bad-preference', 'Invalid floor');
    clean.floor = preference.floor;
  }
  if (preference.height !== undefined) {
    if (!['low', 'high'].includes(preference.height)) throw new Meteor.Error('bad-preference', 'Invalid height');
    clean.height = preference.height;
  }
  return Object.keys(clean).length ? clean : undefined;
};

export const upsertMemberStorageRequest = async ({ owner, requestType, preference, actor, commandId, now = new Date() }) => {
  if (!['allocation', 'move', 'release'].includes(requestType)) {
    throw new Meteor.Error('bad-request-type', 'Invalid storage request type');
  }
  const normalizedPreference = requestType === 'release' ? undefined : cleanPreference(preference);
  if (requestType === 'move' && !normalizedPreference) {
    throw new Meteor.Error('bad-preference', 'A move request needs a preference');
  }
  const eventId = commandId ? storageOperationId('member.request.upsert', actor, commandId) : null;
  const prior = eventId ? await StorageEvents.findOneAsync(eventId) : null;
  if (prior) return prior.entity_id;

  await reconcileStorageState({ ownerIds: [owner._id], now });
  const unit = await StorageUnits.findOneAsync({ owner: owner._id, availability_status: 'occupied' });
  if (requestType === 'allocation' && unit) {
    throw new Meteor.Error('bad-state', 'A member with storage must request a move or release');
  }
  if (requestType !== 'allocation' && !unit) throw new Meteor.Error('bad-state', 'No active storage assignment');
  if (requestType !== 'release' && !hasActiveLabMembershipAt(owner, now)) {
    throw new Meteor.Error('not-eligible', 'Active lab membership required');
  }
  const existing = await StorageRequests.findOneAsync({
    owner: owner._id, request_status: { $in: ['waiting', 'paused_ineligible', 'in_progress'] },
  });
  if (existing?.request_status === 'in_progress') throw new Meteor.Error('bad-state', 'A pending move cannot be edited');

  const requestId = existing?._id || Random.id();
  await runStorageAtomic({
    transactional: async (session) => {
      if (existing) {
        const $set = {
          request_type: requestType, request_status: 'waiting', updatedAt: now,
          ...(unit ? { source_unit: unit._id } : {}),
          ...(normalizedPreference ? { preference: normalizedPreference } : {}),
        };
        const $unset = {};
        if (!unit) $unset.source_unit = '';
        if (!normalizedPreference) $unset.preference = '';
        await casStorageUpdate(StorageRequests,
          { _id: requestId, request_status: existing.request_status, updatedAt: existing.updatedAt },
          { $set, ...(Object.keys($unset).length ? { $unset } : {}) }, { session });
      } else {
        await insertStorageDocument(StorageRequests, STORAGE_SCHEMAS.request, {
          _id: requestId, owner: owner._id, request_type: requestType, requested_at: now,
          ...(normalizedPreference ? { preference: normalizedPreference } : {}),
          ...(unit ? { source_unit: unit._id } : {}),
          request_status: 'waiting', createdAt: now, updatedAt: now,
        }, { session });
      }
      await appendStorageEvent({
        id: eventId, entityType: 'storageRequest', entityId: requestId,
        eventType: existing ? 'request_updated' : 'request_created', actorType: 'member', actor,
        member: owner._id, unit: unit?._id, occurredAt: now,
        details: { request_type: requestType, preference: normalizedPreference },
      }, { session });
    },
  });
  return requestId;
};

export const cancelMemberStorageRequest = async ({ owner, requestId, actor, commandId, now = new Date() }) => {
  const eventId = storageOperationId('member.request.cancel', actor, commandId || requestId);
  if (await StorageEvents.findOneAsync(eventId)) return true;
  const request = await StorageRequests.findOneAsync(requestId);
  if (!request || request.owner !== owner._id) throw new Meteor.Error('not-found', 'Request not found');
  if (!['waiting', 'paused_ineligible'].includes(request.request_status)) {
    throw new Meteor.Error('bad-state', 'This request cannot be cancelled');
  }
  await runStorageAtomic({
    transactional: async (session) => {
      await casStorageUpdate(StorageRequests,
        { _id: requestId, request_status: request.request_status, updatedAt: request.updatedAt },
        { $set: { request_status: 'cancelled', cancelled_at: now, updatedAt: now } }, { session });
      await appendStorageEvent({
        id: eventId, entityType: 'storageRequest', entityId: requestId,
        eventType: 'request_cancelled', actorType: 'member', actor, member: owner._id, occurredAt: now,
      }, { session });
    },
  });
  return true;
};

export const confirmMemberStorageOffer = async ({ owner, offerId, actor, now = new Date() }) => {
  const offer = await StorageOffers.findOneAsync(offerId);
  if (!offer || offer.owner !== owner._id) throw new Meteor.Error('not-found', 'Offer not found');
  if (!hasActiveLabMembershipAt(owner, now)) {
    throw new Meteor.Error('not-eligible', 'Active lab membership required');
  }
  if (!(offer.deadline_at instanceof Date) || offer.deadline_at <= now) {
    throw new Meteor.Error('offer-expired', 'This storage offer has expired. Contact an administrator.');
  }
  return completeStorageOffer({ offerId, actor, actorType: 'member' });
};
