import { Mongo } from 'meteor/mongo';
import 'meteor/aldeed:collection2/static';
import { schemas } from '/imports/common/lib/schemas';

export const DoorUnlocks = new Mongo.Collection('doorunlocks');
DoorUnlocks.attachSchema(schemas.doorunlocks);
// No allow rules: written only through server methods.
