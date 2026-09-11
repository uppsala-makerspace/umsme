import { Mongo } from 'meteor/mongo';
import { schemas } from '/imports/common/lib/schemas';
import { attachServerOnlySchema } from './storageCollection';

export const StorageActionExecutions = attachServerOnlySchema(
  new Mongo.Collection('storageActionExecutions'),
  schemas.storageActionExecution,
);
