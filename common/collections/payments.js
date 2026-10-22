import { Mongo } from 'meteor/mongo';
import 'meteor/aldeed:collection2/static';
import { schemas } from '/imports/common/lib/schemas';

export const Payments = new Mongo.Collection('payments');
Payments.attachSchema(schemas.payment);
// No allow rules: written only through server methods.
