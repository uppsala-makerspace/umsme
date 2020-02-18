import { Mongo } from 'meteor/mongo';
import { schemas } from '../lib/schemas';
import { allow } from './allow';

export const Members = new Mongo.Collection('members');
Members.attachSchema(schemas.member);
allow(Members);
