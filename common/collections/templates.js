import { Mongo } from 'meteor/mongo';
import 'meteor/aldeed:collection2/static';
import { schemas } from '/imports/common/lib/schemas';

export const MessageTemplates = new Mongo.Collection('templates');
MessageTemplates.attachSchema(schemas.template);
// No allow rules: admin writes through the messageTemplates.* methods
// (common/server/messageTemplates/templates.js); other code only reads.
