import { Mongo } from 'meteor/mongo';
import { schemas } from '../lib/schemas';

export const Members = new Mongo.Collection('members');
Members.attachSchema(schemas.member);
