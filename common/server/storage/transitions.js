import { StorageUnits, StorageRequests, StorageOffers } from '/imports/common/collections/storage';
import { casStorageUpdate } from './db';
import { StorageConflictError } from './errors';

export const availableStorageModifier = (now) => ({
  $set: { availability_status: 'available', updatedAt: now },
  $unset: { owner: '', assigned_at: '', assigned_by: '', source_request: '', warning: '', exemption: '' },
});

export const awaitingClearanceModifier = (now) => ({
  $set: { availability_status: 'awaiting_clearance', updatedAt: now },
  $unset: { warning: '', exemption: '' },
});

export const markUnitForClearance = (unit, now, session) => casStorageUpdate(StorageUnits,
  { _id: unit._id, availability_status: 'occupied', owner: unit.owner, updatedAt: unit.updatedAt },
  awaitingClearanceModifier(now), { session });

export const clearStorageUnit = (unit, now, session) => casStorageUpdate(StorageUnits,
  { _id: unit._id, availability_status: 'awaiting_clearance', updatedAt: unit.updatedAt },
  availableStorageModifier(now), { session });

export const removeStorageOffer = async (offer, session) => {
  const result = await StorageOffers.rawCollection().deleteOne(
    { _id: offer._id, updatedAt: offer.updatedAt }, { session });
  if (result.deletedCount !== 1) throw new StorageConflictError();
};

export const extendStorageOffer = (offer, deadline, now, session) => casStorageUpdate(StorageOffers,
  { _id: offer._id, updatedAt: offer.updatedAt },
  { $set: { deadline_at: deadline, updatedAt: now } }, { session });

export const cancelStorageOffer = async ({ offer, unit, request, cancelRequest, now, session }) => {
  await casStorageUpdate(StorageUnits,
    { _id: unit._id, availability_status: 'reserved', owner: offer.owner, updatedAt: unit.updatedAt },
    { $set: { availability_status: 'available', updatedAt: now }, $unset: { owner: '' } }, { session });
  await casStorageUpdate(StorageRequests,
    { _id: request._id, request_status: 'in_progress', updatedAt: request.updatedAt },
    cancelRequest
      ? { $set: { request_status: 'cancelled', cancelled_at: now, updatedAt: now } }
      : { $set: { request_status: 'waiting', updatedAt: now }, $unset: { cancelled_at: '', fulfilled_at: '' } },
    { session });
  await removeStorageOffer(offer, session);
};
