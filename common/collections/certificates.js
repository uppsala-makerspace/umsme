import { Mongo } from 'meteor/mongo';
import 'meteor/aldeed:collection2/static';
import { schemas } from '/imports/common/lib/schemas';
import { allow } from './allow';

export const Certificates = new Mongo.Collection('certificates');
Certificates.attachSchema(schemas.certificate);
allow(Certificates);

// Deny rules for mandatory certificate protection. The doc handed to deny
// callbacks contains only _id, so the rules fetch the current document.
Certificates.deny({
  // Prevent deleting a mandatory certificate
  async remove(userId, doc) {
    const current = (await Certificates.findOneAsync(doc._id)) || doc;
    return !!current.mandatory;
  },
  // Prevent unmarking a mandatory certificate or marking a second one as mandatory
  async update(userId, doc, fields, modifier) {
    const current = (await Certificates.findOneAsync(doc._id)) || doc;
    // If trying to set mandatory to true, check if another certificate is already mandatory
    if (modifier.$set && modifier.$set.mandatory === true && !current.mandatory) {
      const existingMandatory = await Certificates.findOneAsync({ mandatory: true });
      if (existingMandatory) {
        return true;
      }
    }
    // If this certificate is mandatory, prevent unsetting the mandatory flag
    if (current.mandatory) {
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
