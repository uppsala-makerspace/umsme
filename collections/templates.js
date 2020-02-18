import { Mongo } from 'meteor/mongo';
import { schemas } from '../lib/schemas';
import { allow } from './allow';

export const MessageTemplates = new Mongo.Collection('templates');
MessageTemplates.attachSchema(schemas.template);
allow(Members);
