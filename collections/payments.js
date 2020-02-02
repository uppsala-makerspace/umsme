import { Mongo } from 'meteor/mongo';
import { schemas } from '../lib/schemas';

export const Payments = new Mongo.Collection('payments');
Payments.attachSchema(schemas.payment);
