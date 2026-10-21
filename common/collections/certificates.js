import { Mongo } from 'meteor/mongo';
import 'meteor/aldeed:collection2/static';
import { schemas } from '/imports/common/lib/schemas';

export const Certificates = new Mongo.Collection('certificates');
Certificates.attachSchema(schemas.certificate);
// No allow rules: admin writes through the certificates.* methods
// (common/server/certificates/certificates.js), which keep the one mandatory
// certificate; the app goes through its own methods.
