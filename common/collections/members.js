import { Mongo } from 'meteor/mongo';
import 'meteor/aldeed:collection2/static';
import { schemas } from '/imports/common/lib/schemas';
import { allow } from './allow';

export const Members = new Mongo.Collection('members');
Members.attachSchema(schemas.member);
allow(Members);

const legacyStorageFields = ['storage', 'storagequeue', 'storagerequest'];
Members.deny({
  insert: (userId, document) => legacyStorageFields.some((field) => document[field] !== undefined),
  update: (userId, document, fields) => (fields || []).some((field) => legacyStorageFields.includes(field)),
});
