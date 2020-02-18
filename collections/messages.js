import { Mongo } from 'meteor/mongo';
import { schemas } from '../lib/schemas';
import { allow } from './allow';

export const Messages = new Mongo.Collection('messages');
Messages.attachSchema(schemas.message);
allow(Members);
