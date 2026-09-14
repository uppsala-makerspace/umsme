import { Mongo } from 'meteor/mongo';
import { schemas } from '/imports/common/lib/schemas';
import { attachServerOnlySchema } from './storageCollection';

export const StorageWarnings = attachServerOnlySchema(
  new Mongo.Collection('storageWarnings'),
  schemas.storageWarning,
);
