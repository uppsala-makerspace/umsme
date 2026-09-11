import { Mongo } from 'meteor/mongo';
import { schemas } from '/imports/common/lib/schemas';
import { attachServerOnlySchema } from './storageCollection';

export const StorageUnits = attachServerOnlySchema(
  new Mongo.Collection('storageUnits'),
  schemas.storageUnit,
);
