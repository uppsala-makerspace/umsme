import { Mongo } from 'meteor/mongo';
import 'meteor/aldeed:collection2/static';
import { schemas } from '/imports/common/lib/schemas';

export const Attestations = new Mongo.Collection('attestations');
Attestations.attachSchema(schemas.attestation);
// No allow rules: admin grants and revokes through the certificates.*
// methods, the app requests and confirms through its own.
