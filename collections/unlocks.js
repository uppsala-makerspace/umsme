import { Mongo } from 'meteor/mongo';
import 'meteor/aldeed:collection2/static';
import { schemas } from '/lib/schemas';
import { allow } from './allow';

export const Unlocks = new Mongo.Collection('unlocks');
Unlocks.attachSchema(schemas.unlocks);
allow(Unlocks);
