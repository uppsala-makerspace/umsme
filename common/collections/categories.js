import { Mongo } from 'meteor/mongo';
import 'meteor/aldeed:collection2/static';
import { schemas } from '/imports/common/lib/schemas';

/** The website's categories, shared by groups, workshops, activities and events. */
export const Categories = new Mongo.Collection('categories');
Categories.attachSchema(schemas.category);
// No allow rules: every write goes through methods (common/server/categories.js).
