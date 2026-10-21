import { Mongo } from 'meteor/mongo';
import 'meteor/aldeed:collection2/static';
import { schemas } from '/imports/common/lib/schemas';

export const Memberships = new Mongo.Collection('membership');
Memberships.attachSchema(schemas.membership);
// No allow rules: written only through server methods.
