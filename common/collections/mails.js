import { Mongo } from 'meteor/mongo';
import 'meteor/aldeed:collection2/static';
import { schemas } from '../lib/schemas';
import { allow } from './allow';

export const Mails = new Mongo.Collection('mails');
Mails.attachSchema(schemas.mails);
allow(Mails);
