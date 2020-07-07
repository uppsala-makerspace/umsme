import { Mongo } from 'meteor/mongo';
import { schemas } from '../lib/schemas';
import { allow } from './allow';

export const Comments = new Mongo.Collection('comments');
Comments.attachSchema(schemas.comments);
allow(Comments);
