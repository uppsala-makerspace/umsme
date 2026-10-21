import { Mongo } from 'meteor/mongo';
import 'meteor/aldeed:collection2/static';
import { schemas } from '/imports/common/lib/schemas';

export const Messages = new Mongo.Collection('messages');
Messages.attachSchema(schemas.message);
// No allow rules: written only through server methods.

export const isStorageGeneratedMessage = (document) =>
  typeof document?._id === 'string' && document._id.startsWith('storage-notification:');
