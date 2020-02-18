import { Mongo } from 'meteor/mongo';
import { schemas } from '../lib/schemas';
import { allow } from './allow';

export const Memberships = new Mongo.Collection('membership');
Memberships.attachSchema(schemas.membership);
allow(Members);
