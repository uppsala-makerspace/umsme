import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { requireRole, DOMAIN_ROLES } from '/imports/common/server/authz';
import {
  createLiabilityDocument,
  updateLiabilityDocument,
  removeLiabilityDocument,
} from '/imports/common/server/liability/documents';

const DocumentFields = {
  title: String,
  date: Date,
  text: { sv: Match.Maybe(String), en: Match.Maybe(String) },
};

Meteor.methods({
  async 'liability.create'(fields) {
    check(fields, DocumentFields);
    await requireRole(this.userId, DOMAIN_ROLES.liability);
    return createLiabilityDocument(fields, { userId: this.userId });
  },

  async 'liability.update'(docId, fields, expectedUpdatedAt) {
    check(docId, String);
    check(fields, DocumentFields);
    check(expectedUpdatedAt, Match.Maybe(Date));
    await requireRole(this.userId, DOMAIN_ROLES.liability);
    await updateLiabilityDocument(docId, fields, { userId: this.userId, expectedUpdatedAt: expectedUpdatedAt ?? null });
  },

  async 'liability.remove'(docId) {
    check(docId, String);
    await requireRole(this.userId, DOMAIN_ROLES.liability);
    await removeLiabilityDocument(docId, { userId: this.userId });
  },
});
