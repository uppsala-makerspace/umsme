import { Mongo } from 'meteor/mongo';
import 'meteor/aldeed:collection2/static';
import { schemas } from '/imports/common/lib/schemas';
import { allow } from './allow';

export const Announcements = new Mongo.Collection('announcements');
Announcements.attachSchema(schemas.announcement);
allow(Announcements);
