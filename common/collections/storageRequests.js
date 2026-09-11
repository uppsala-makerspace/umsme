import { Mongo } from 'meteor/mongo';
import { schemas } from '/imports/common/lib/schemas';
import { attachServerOnlySchema } from './storageCollection';

export const StorageRequests = attachServerOnlySchema(
  new Mongo.Collection('storageRequests'),
  schemas.storageRequest,
);
