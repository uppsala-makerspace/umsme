import { Mongo } from 'meteor/mongo';
import 'meteor/aldeed:collection2/static';
import { schemas } from '/lib/schemas';
import { allow } from './allow';

export const Memberships = new Mongo.Collection('membership');
Memberships.attachSchema(schemas.membership);
allow(Memberships);
