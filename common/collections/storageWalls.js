import { Mongo } from 'meteor/mongo';
import { schemas } from '/imports/common/lib/schemas';
import { attachServerOnlySchema } from './storageCollection';

export const StorageWalls = attachServerOnlySchema(
  new Mongo.Collection('storageWalls'),
  schemas.storageWall,
);
