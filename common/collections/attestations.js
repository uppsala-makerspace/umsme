import { Mongo } from 'meteor/mongo';
import 'meteor/aldeed:collection2/static';
import { schemas } from '/imports/common/lib/schemas';
import { allow } from './allow';

export const Attestations = new Mongo.Collection('attestations');
Attestations.attachSchema(schemas.attestation);
allow(Attestations);
