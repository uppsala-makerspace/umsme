import { Mongo } from 'meteor/mongo';
import 'meteor/aldeed:collection2/static';
import { schemas } from '/imports/common/lib/schemas';
import { allow } from './allow';

export const LiabilityDocuments = new Mongo.Collection('liabilityDocuments');
LiabilityDocuments.attachSchema(schemas.liabilityDocument);
allow(LiabilityDocuments);
