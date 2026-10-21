import { Mongo } from 'meteor/mongo';
import 'meteor/aldeed:collection2/static';
import { schemas } from '/imports/common/lib/schemas';

export const Comments = new Mongo.Collection('comments');
Comments.attachSchema(schemas.comments);
// No allow rules: written only through server methods.
