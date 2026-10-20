import { Mongo } from 'meteor/mongo';
import 'meteor/aldeed:collection2/static';
import { schemas } from '/imports/common/lib/schemas';

export const Announcements = new Mongo.Collection('announcements');
Announcements.attachSchema(schemas.announcement);
// No allow rules: written only through server methods.
