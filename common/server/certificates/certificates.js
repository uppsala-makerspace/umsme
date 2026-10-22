import { Meteor } from 'meteor/meteor';
import { Certificates } from '/imports/common/collections/certificates';
import { Attestations } from '/imports/common/collections/attestations';
import { Workshops } from '/imports/common/collections/workshops';
import { Members } from '/imports/common/collections/members';
import { wouldCreateCycle } from '/imports/common/lib/rules';
import { recordChange } from '/imports/common/server/auditLog';
import { text, bilingual, setOrUnset } from '../groups/text';

/**
 * Certificates (certifikat) and attestations (intyg), the record that a
 * member holds one. A certificate may belong to a workshop, may need other
 * certificates first (prerequisites, never in a cycle), may be granted by
 * named certifiers or anyone with its certifier role, and may be awarded by
 * a test instead. At most one certificate is mandatory for membership, and
 * once mandatory it stays so and cannot be deleted.
 */

const DOMAIN = 'certificates';

const existing = async (collection, ids, what) => {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length && (await collection.find({ _id: { $in: unique } }).countAsync()) !== unique.length) {
    throw new Meteor.Error('not-found', `No such ${what}`);
  }
  return unique;
};

const testOf = (test) => {
  if (!test) return null;
  const testId = text(test.testId);
  if (!testId) return null;
  if (!(Number.isInteger(test.maxAttempts) && test.maxAttempts >= 1)) throw new Meteor.Error('bad-test', 'Max attempts must be at least 1');
  if (!(Number.isInteger(test.maxErrors) && test.maxErrors >= 0)) throw new Meteor.Error('bad-test', 'Max errors must be 0 or more');
  return { testId, maxAttempts: test.maxAttempts, maxErrors: test.maxErrors };
};

const changesOf = async (fields, selfId) => {
  const sv = text(fields.name?.sv);
  if (!sv) throw new Meteor.Error('bad-name', 'A certificate needs a Swedish name');
  const days = fields.defaultValidityDays;
  if (days !== null && days !== undefined && !(Number.isInteger(days) && days > 0)) {
    throw new Meteor.Error('bad-validity', 'The default validity is a whole number of days');
  }
  const workshopId = text(fields.workshopId);
  await existing(Workshops, [workshopId], 'workshop');
  const certifiers = await existing(Members, fields.certifiers || [], 'member');
  const prerequisites = await existing(Certificates, fields.prerequisites || [], 'certificate');
  if (selfId && prerequisites.length) {
    const byId = Object.fromEntries((await Certificates.find({}, { fields: { prerequisites: 1 } }).fetchAsync()).map((c) => [c._id, c]));
    byId[selfId] = { ...byId[selfId], prerequisites: [] };
    if (prerequisites.some((id) => wouldCreateCycle(selfId, id, byId))) {
      throw new Meteor.Error('prerequisite-cycle', 'A prerequisite may not depend on this certificate, directly or through others');
    }
  }
  const changes = { $set: {}, $unset: {} };
  changes.$set.name = { sv, ...(text(fields.name?.en) ? { en: text(fields.name.en) } : {}) };
  setOrUnset(changes, {
    description: bilingual(fields.description),
    defaultValidityDays: days ?? null,
    certifierRole: text(fields.certifierRole),
    workshopId,
    certifiers,
    prerequisites,
    test: testOf(fields.test),
  });
  return changes;
};

const current = async (docId, expectedUpdatedAt) => {
  const before = await Certificates.findOneAsync(docId);
  if (!before) throw new Meteor.Error('not-found', 'No such certificate');
  if (expectedUpdatedAt !== undefined
      && (before.updatedAt?.getTime() ?? null) !== (expectedUpdatedAt?.getTime() ?? null)) {
    throw new Meteor.Error('conflict', 'Someone else changed this certificate; reload it and try again');
  }
  return before;
};

/** @returns {Promise<string>} the new certificate's id */
export const createCertificate = async (fields, { userId }) => {
  const { $set } = await changesOf(fields, null);
  const now = new Date();
  const doc = { ...$set, createdAt: now, updatedAt: now };
  const docId = await Certificates.insertAsync(doc);
  await recordChange({ userId, domain: DOMAIN, action: 'create', docId, after: doc });
  return docId;
};

/** Update a certificate, refused with 'conflict' if it changed since `expectedUpdatedAt`. */
export const updateCertificate = async (docId, fields, { userId, expectedUpdatedAt }) => {
  const before = await current(docId, expectedUpdatedAt);
  const { $set, $unset } = await changesOf(fields, docId);
  $set.updatedAt = new Date();
  await Certificates.updateAsync(docId, Object.keys($unset).length ? { $set, $unset } : { $set });
  await recordChange({ userId, domain: DOMAIN, action: 'update', docId, before, after: await Certificates.findOneAsync(docId) });
};

/** Make a certificate the one mandatory for membership; there can be only one, and it stays. */
export const markMandatory = async (docId, { userId }) => {
  const before = await current(docId);
  if (before.mandatory) return;
  if (await Certificates.findOneAsync({ mandatory: true })) {
    throw new Meteor.Error('mandatory-exists', 'Another certificate is already mandatory for membership');
  }
  await Certificates.updateAsync(docId, { $set: { mandatory: true, updatedAt: new Date() } });
  await recordChange({ userId, domain: DOMAIN, action: 'markMandatory', docId, before, after: await Certificates.findOneAsync(docId) });
};

/**
 * Remove a certificate, never the mandatory one. Its attestations stay, as
 * they did before the move to methods, and other certificates no longer
 * need it first.
 */
export const removeCertificate = async (docId, { userId }) => {
  const before = await current(docId);
  if (before.mandatory) throw new Meteor.Error('mandatory', 'The mandatory certificate cannot be deleted');
  const holders = await Attestations.find({ certificateId: docId }).countAsync();
  if (holders) throw new Meteor.Error('has-holders', `${holders} members hold this certificate; revoke theirs before deleting it`);
  await Certificates.removeAsync(docId);
  await Certificates.updateAsync({ prerequisites: docId }, { $pull: { prerequisites: docId } }, { multi: true });
  await recordChange({ userId, domain: DOMAIN, action: 'remove', docId, before });
};

/**
 * Grant a certificate to a member. Without an end date, the certificate's
 * default validity sets one. An attestation granted here is confirmed at once.
 *
 * @returns {Promise<string>} the attestation's id
 */
export const grantAttestation = async ({ certificateId, memberId, certifierId, startDate, endDate, comment }, { userId }) => {
  const certificate = await current(certificateId);
  await existing(Members, [memberId, certifierId], 'member');
  if (!certifierId) throw new Meteor.Error('certifier-required', 'Choose who certifies');
  const start = startDate || new Date();
  let end = endDate || null;
  if (!end && certificate.defaultValidityDays) {
    end = new Date(start);
    end.setDate(end.getDate() + certificate.defaultValidityDays);
  }
  if (end && end < start) throw new Meteor.Error('bad-dates', 'The end date is before the start date');
  const doc = {
    certificateId, memberId, certifierId, startDate: start, confirmedAt: new Date(),
    ...(end ? { endDate: end } : {}),
    ...(text(comment) ? { comment: text(comment) } : {}),
  };
  const docId = await Attestations.insertAsync(doc);
  await recordChange({ userId, domain: 'attestations', action: 'grant', docId, after: doc });
  return docId;
};

/** Take back an attestation. */
export const revokeAttestation = async (docId, { userId }) => {
  const before = await Attestations.findOneAsync(docId);
  if (!before) throw new Meteor.Error('not-found', 'No such attestation');
  await Attestations.removeAsync(docId);
  await recordChange({ userId, domain: 'attestations', action: 'revoke', docId, before });
};

/** The members who do not yet hold the mandatory certificate, and it. */
const withoutMandatory = async () => {
  const certificate = await Certificates.findOneAsync({ mandatory: true });
  if (!certificate) throw new Meteor.Error('no-mandatory', 'No certificate is mandatory');
  const holders = await Attestations.rawCollection().distinct('memberId', { certificateId: certificate._id });
  const members = await Members.find({ _id: { $nin: holders } }, { fields: { _id: 1 } }).fetchAsync();
  return { certificate, memberIds: members.map((m) => m._id) };
};

/** How many members granting the mandatory certificate to all would reach. */
export const mandatoryGrantCount = async () => {
  const { certificate, memberIds } = await withoutMandatory();
  return { name: certificate.name?.sv, count: memberIds.length };
};

/** Grant the mandatory certificate to every member who lacks it, certified by `certifierId`. */
export const grantMandatoryToAll = async (certifierId, { userId }) => {
  const { certificate, memberIds } = await withoutMandatory();
  await existing(Members, [certifierId], 'member');
  const startDate = new Date();
  for (const memberId of memberIds) {
    await Attestations.insertAsync({ certificateId: certificate._id, memberId, certifierId, startDate, confirmedAt: startDate });
  }
  await recordChange({ userId, domain: 'attestations', action: 'grantMandatoryToAll', docId: certificate._id, after: { count: memberIds.length } });
  return memberIds.length;
};

const named = async (ids) => Object.fromEntries((await Members.find(
  { _id: { $in: [...new Set(ids.filter(Boolean))] } }, { fields: { name: 1, mid: 1 } },
).fetchAsync()).map((m) => [m._id, m]));

const row = (a, people) => ({
  _id: a._id,
  certificateId: a.certificateId,
  memberId: a.memberId,
  memberName: people[a.memberId]?.name || a.memberId,
  memberMid: people[a.memberId]?.mid || null,
  certifierId: a.certifierId || null,
  certifierName: a.certifierId === '__system__' ? 'System (test)' : (people[a.certifierId]?.name || a.certifierId || null),
  startDate: a.startDate,
  endDate: a.endDate || null,
  comment: a.comment || null,
  pending: !a.certifierId,
});

/** Who holds a certificate (and who asked for it), with names. */
export const certificateHolders = async (certificateId) => {
  const attestations = await Attestations.find({ certificateId }, { sort: { startDate: -1 } }).fetchAsync();
  const people = await named(attestations.flatMap((a) => [a.memberId, a.certifierId]));
  return attestations.map((a) => row(a, people));
};

/** What a member holds (and has asked for), with the certificates' and certifiers' names. */
export const memberCertificates = async (memberId) => {
  const attestations = await Attestations.find({ memberId }, { sort: { startDate: -1 } }).fetchAsync();
  const people = await named(attestations.map((a) => a.certifierId));
  const certificates = Object.fromEntries((await Certificates.find(
    { _id: { $in: attestations.map((a) => a.certificateId) } }, { fields: { name: 1 } },
  ).fetchAsync()).map((c) => [c._id, c]));
  return attestations.map((a) => ({ ...row(a, people), certificateName: certificates[a.certificateId]?.name?.sv || a.certificateId }));
};
