import { Meteor } from 'meteor/meteor';
import { Members } from '/imports/common/collections/members';
import { Memberships } from '/imports/common/collections/memberships';
import { Comments } from '/imports/common/collections/comments';
import { StorageWalls, StorageUnits, StorageRequests, StorageOffers, StorageEvents } from '/imports/common/collections/storage';

export const STORAGE_COLLECTIONS = {
  storageWalls: StorageWalls,
  storageUnits: StorageUnits,
  storageRequests: StorageRequests,
  storageOffers: StorageOffers,
  storageEvents: StorageEvents,
};

export const loadLegacyStorageSource = async (cutoff) => {
  const [members, memberships, comments] = await Promise.all([
    Members.find({}).fetchAsync(),
    Memberships.find({}).fetchAsync(),
    Comments.find({ about: { $regex: '^_box' } }).fetchAsync(),
  ]);
  return { walls: Meteor.settings.public?.storageWalls || [], members, memberships, comments, cutoff };
};
