import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import 'meteor/aldeed:collection2/static';
import { schemas } from '/imports/common/lib/schemas';

export const ActivityCategories = new Mongo.Collection('activityCategories');
ActivityCategories.attachSchema(schemas.activityCategory);
// No allow rules: every write goes through methods
// (common/server/activities/), in admin and the app alike.
