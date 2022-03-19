import { Mongo } from 'meteor/mongo';
import { schemas } from '../lib/schemas';
import { allow } from './allow';

export const Unlocks = new Mongo.Collection('unlocks');
Unlocks.attachSchema(schemas.unlocks);
allow(Unlocks);
