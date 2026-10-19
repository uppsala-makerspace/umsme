import { Mongo } from 'meteor/mongo';
import 'meteor/aldeed:collection2/static';
import { schemas } from '/imports/common/lib/schemas';

export const LiabilityDocuments = new Mongo.Collection('liabilityDocuments');
LiabilityDocuments.attachSchema(schemas.liabilityDocument);
// No allow rules: admin writes through the liability.* methods
// (common/server/liability/documents.js), the app only reads on the server.
