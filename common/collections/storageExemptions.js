import { Mongo } from 'meteor/mongo';
import { schemas } from '/imports/common/lib/schemas';
import { attachServerOnlySchema } from './storageCollection';

export const StorageExemptions = attachServerOnlySchema(
  new Mongo.Collection('storageExemptions'),
  schemas.storageExemption,
);
