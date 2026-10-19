import { Mongo } from 'meteor/mongo';
import 'meteor/aldeed:collection2/static';
import { schemas } from '/imports/common/lib/schemas';

export const Groups = new Mongo.Collection('groups');
Groups.attachSchema(schemas.group);
// No allow rules: admin writes through the groups.* methods
// (common/server/groups/groups.js), which hold the rules the schema cannot
// express; the app goes through its own methods.
