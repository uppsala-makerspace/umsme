import { Mongo } from 'meteor/mongo';
import { schemas } from '../lib/schemas';
import { allow } from './allow';

export const Mails = new Mongo.Collection('mails');
Mails.attachSchema(schemas.mails);
allow(Mails);
