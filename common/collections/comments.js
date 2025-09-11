import { Mongo } from 'meteor/mongo';
import 'meteor/aldeed:collection2/static';
import { schemas } from '/imports/common/lib/schemas';
import { allow } from './allow';

export const Comments = new Mongo.Collection('comments');
Comments.attachSchema(schemas.comments);
allow(Comments);
