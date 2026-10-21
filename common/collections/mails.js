import { Mongo } from 'meteor/mongo';
import 'meteor/aldeed:collection2/static';
import { schemas } from '../lib/schemas';

export const Mails = new Mongo.Collection('mails');
Mails.attachSchema(schemas.mails);
// No allow rules: written only through server methods.
