import { Mongo } from 'meteor/mongo';
import { schemas } from '/imports/common/lib/schemas';
import { attachServerOnlySchema } from './storageCollection';

export const StorageAssignments = attachServerOnlySchema(
  new Mongo.Collection('storageAssignments'),
  schemas.storageAssignment,
);
