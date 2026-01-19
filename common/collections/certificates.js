import { Mongo } from 'meteor/mongo';
import 'meteor/aldeed:collection2/static';
import { schemas } from '/imports/common/lib/schemas';
import { allow } from './allow';

export const Certificates = new Mongo.Collection('certificates');
Certificates.attachSchema(schemas.certificate);
allow(Certificates);

// Deny rules for mandatory certificate protection
Certificates.deny({
  // Prevent deleting a mandatory certificate
  remove(userId, doc) {
    if (doc.mandatory) {
      return true;
    }
    return false;
  },
  // Prevent unmarking a mandatory certificate or marking a second one as mandatory
  async update(userId, doc, fields, modifier) {
    // If trying to set mandatory to true, check if another certificate is already mandatory
    if (modifier.$set && modifier.$set.mandatory === true && !doc.mandatory) {
      const existingMandatory = await Certificates.findOneAsync({ mandatory: true });
      if (existingMandatory) {
        return true;
      }
    }
    // If this certificate is mandatory, prevent unsetting the mandatory flag
    if (doc.mandatory) {
      if (modifier.$set && modifier.$set.mandatory === false) {
        return true;
      }
      if (modifier.$unset && modifier.$unset.mandatory) {
        return true;
      }
    }
    return false;
  }
});
