import { Mongo } from 'meteor/mongo';
import 'meteor/aldeed:collection2/static';
import { schemas } from '/imports/common/lib/schemas';

export const Unlocks = new Mongo.Collection('unlocks');
Unlocks.attachSchema(schemas.unlocks);
// No allow rules: written only through server methods.
