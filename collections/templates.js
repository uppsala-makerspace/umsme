import { Mongo } from 'meteor/mongo';
import { schemas } from '../lib/schemas';

export const MessageTemplates = new Mongo.Collection('templates');
MessageTemplates.attachSchema(schemas.template);
