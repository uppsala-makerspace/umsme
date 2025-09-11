import { Mongo } from 'meteor/mongo';
import 'meteor/aldeed:collection2/static';
import { schemas } from '/imports/common/lib/schemas';
import { allow } from './allow';

export const initiatedPayments = new Mongo.Collection('initiatedPayments')
initiatedPayments.attachSchema(schemas.initiatedPayments);
allow(initiatedPayments);