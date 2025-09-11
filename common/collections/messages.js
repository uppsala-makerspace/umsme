import { Mongo } from 'meteor/mongo';
import 'meteor/aldeed:collection2/static';
import { schemas } from '/imports/common/lib/schemas';
import { allow } from './allow';

export const Messages = new Mongo.Collection('messages');
Messages.attachSchema(schemas.message);
allow(Messages);
