import { Mongo } from 'meteor/mongo';
import { schemas } from '../lib/schemas';
import { allow } from './allow';

export const Payments = new Mongo.Collection('payments');
Payments.attachSchema(schemas.payment);
allow(Members);
