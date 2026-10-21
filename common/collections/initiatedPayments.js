import { Mongo } from 'meteor/mongo';
import 'meteor/aldeed:collection2/static';
import { schemas } from '/imports/common/lib/schemas';

export const initiatedPayments = new Mongo.Collection('initiatedPayments')
initiatedPayments.attachSchema(schemas.initiatedPayments);
// No allow rules: written only through server methods.
