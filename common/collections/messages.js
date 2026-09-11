import { Mongo } from 'meteor/mongo';
import 'meteor/aldeed:collection2/static';
import { schemas } from '/imports/common/lib/schemas';
import { allow } from './allow';

export const Messages = new Mongo.Collection('messages');
Messages.attachSchema(schemas.message);
allow(Messages);

export const isStorageGeneratedMessage = (document) =>
  typeof document?._id === 'string' && document._id.startsWith('storage-notification:');

// Ordinary message composition keeps its historical allow rules. Only the
// deterministic rows proving a storage email send are server-owned.
Messages.deny({
  insert(userId, document) { return isStorageGeneratedMessage(document); },
  update(userId, document) { return isStorageGeneratedMessage(document); },
  remove(userId, document) { return isStorageGeneratedMessage(document); },
});
