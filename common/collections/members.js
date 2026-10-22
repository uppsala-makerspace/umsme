import { Mongo } from 'meteor/mongo';
import 'meteor/aldeed:collection2/static';
import { schemas } from '/imports/common/lib/schemas';

export const Members = new Mongo.Collection('members');
Members.attachSchema(schemas.member);
// No allow rules: written only through server methods.

