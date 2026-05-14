import { Mongo } from 'meteor/mongo';
import 'meteor/aldeed:collection2/static';
import { schemas } from '/imports/common/lib/schemas';
import { allow } from './allow';

export const DoorUnlocks = new Mongo.Collection('doorunlocks');
DoorUnlocks.attachSchema(schemas.doorunlocks);
allow(DoorUnlocks);
