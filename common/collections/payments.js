import { Mongo } from 'meteor/mongo';
import 'meteor/aldeed:collection2/static';
import { schemas } from '/imports/common/lib/schemas';
import { allow } from './allow';

export const Payments = new Mongo.Collection('payments');
Payments.attachSchema(schemas.payment);
allow(Payments);
