import { Mongo } from 'meteor/mongo';
import { schemas } from '/imports/common/lib/schemas';
import { attachServerOnlySchema } from './storageCollection';

export const StorageEvents = attachServerOnlySchema(
  new Mongo.Collection('storageEvents'),
  schemas.storageEvent,
);
