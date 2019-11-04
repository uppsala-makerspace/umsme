import { Mongo } from 'meteor/mongo';
import { schemas } from '../lib/schemas';

export const Memberships = new Mongo.Collection('membership');
Memberships.attachSchema(schemas.membership);
