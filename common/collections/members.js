import { Mongo } from 'meteor/mongo';
import 'meteor/aldeed:collection2/static';
import { schemas } from '/imports/common/lib/schemas';
import { allow } from './allow';

export const Members = new Mongo.Collection('members');
Members.attachSchema(schemas.member);
allow(Members);