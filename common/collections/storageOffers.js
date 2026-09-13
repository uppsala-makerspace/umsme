import { Mongo } from 'meteor/mongo';
import { schemas } from '/imports/common/lib/schemas';
import { attachServerOnlySchema } from './storageCollection';

export const StorageOffers = attachServerOnlySchema(
  new Mongo.Collection('storageOffers'),
  schemas.storageOffer,
);
