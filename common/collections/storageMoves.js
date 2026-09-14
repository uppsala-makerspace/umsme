import { Mongo } from 'meteor/mongo';
import { schemas } from '/imports/common/lib/schemas';
import { attachServerOnlySchema } from './storageCollection';

export const StorageMoves = attachServerOnlySchema(
  new Mongo.Collection('storageMoves'),
  schemas.storageMove,
);
