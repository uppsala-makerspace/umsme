import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { requireRole, DOMAIN_ROLES } from '/imports/common/server/authz';
import { memberForUser } from '/imports/common/server/memberForUser';
import {
  createCertificate, updateCertificate, markMandatory, removeCertificate, grantAttestation, revokeAttestation,
  mandatoryGrantCount, grantMandatoryToAll, certificateHolders, memberCertificates,
} from '/imports/common/server/certificates/certificates';

const roles = DOMAIN_ROLES.certificates;
const Bilingual = Match.Maybe({ sv: Match.Maybe(String), en: Match.Maybe(String) });
const CertificateFields = {
  name: { sv: String, en: Match.Maybe(String) },
  description: Match.Optional(Bilingual),
  defaultValidityDays: Match.Optional(Match.Maybe(Match.Integer)),
  certifierRole: Match.Optional(Match.Maybe(String)),
  workshopId: Match.Optional(Match.Maybe(String)),
  certifiers: Match.Optional([String]),
  prerequisites: Match.Optional([String]),
  test: Match.Optional(Match.Maybe({ testId: String, maxAttempts: Match.Integer, maxErrors: Match.Integer })),
};

Meteor.methods({
  async 'certificates.create'(fields) {
    check(fields, CertificateFields);
    await requireRole(this.userId, roles);
    return createCertificate(fields, { userId: this.userId });
  },

  async 'certificates.update'(docId, fields, expectedUpdatedAt) {
    check(docId, String);
    check(fields, CertificateFields);
    check(expectedUpdatedAt, Match.Maybe(Date));
    await requireRole(this.userId, roles);
    await updateCertificate(docId, fields, { userId: this.userId, expectedUpdatedAt: expectedUpdatedAt ?? null });
  },

  async 'certificates.markMandatory'(docId) {
    check(docId, String);
    await requireRole(this.userId, roles);
    await markMandatory(docId, { userId: this.userId });
  },

  async 'certificates.remove'(docId) {
    check(docId, String);
    await requireRole(this.userId, roles);
    await removeCertificate(docId, { userId: this.userId });
  },

  async 'certificates.grant'(attestation) {
    check(attestation, {
      certificateId: String,
      memberId: String,
      certifierId: String,
      startDate: Date,
      endDate: Match.Optional(Match.OneOf(null, Date)),
      comment: Match.Optional(Match.OneOf(null, String)),
    });
    await requireRole(this.userId, roles);
    return grantAttestation(attestation, { userId: this.userId });
  },

  async 'certificates.revoke'(attestationId) {
    check(attestationId, String);
    await requireRole(this.userId, roles);
    await revokeAttestation(attestationId, { userId: this.userId });
  },

  async 'certificates.holders'(certificateId) {
    check(certificateId, String);
    await requireRole(this.userId, roles);
    return certificateHolders(certificateId);
  },

  async 'certificates.ofMember'(memberId) {
    check(memberId, String);
    await requireRole(this.userId, roles);
    return memberCertificates(memberId);
  },

  async 'certificates.mandatoryGrantCount'() {
    await requireRole(this.userId, ['admin']);
    return mandatoryGrantCount();
  },

  /** The admin console's grant to all, certified by the admin's own member. */
  async 'certificates.grantMandatoryToAll'() {
    await requireRole(this.userId, ['admin']);
    const certifier = await memberForUser(await Meteor.users.findOneAsync(this.userId));
    if (!certifier) throw new Meteor.Error('no-member', 'Your user account is not linked to a member record');
    return grantMandatoryToAll(certifier._id, { userId: this.userId });
  },

  /** The logged-in user's own member, who certifies by default. */
  async 'certificates.defaultCertifier'() {
    await requireRole(this.userId, roles);
    const member = await memberForUser(await Meteor.users.findOneAsync(this.userId));
    return member ? { _id: member._id, name: member.name, mid: member.mid } : null;
  },
});
