import { Mongo } from 'meteor/mongo';
import { schemas } from '/imports/common/lib/schemas';
import { attachServerOnlySchema } from './storageCollection';

export const StorageNotificationDeliveries = attachServerOnlySchema(
  new Mongo.Collection('storageNotificationDeliveries'),
  schemas.storageNotificationDelivery,
);
