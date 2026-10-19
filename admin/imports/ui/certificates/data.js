import { Meteor } from 'meteor/meteor';
import { useTracker } from 'meteor/react-meteor-data';
import { Certificates } from '/imports/common/collections/certificates';
import { getRoleOptions } from '/imports/common/lib/models';

/**
 * Data for the certificate pages: the narrow publications and the methods.
 * The pages' containers use this; the pure components never do.
 */

const LIST_FIELDS = { name: 1, workshopId: 1, mandatory: 1, defaultValidityDays: 1, certifierRole: 1, prerequisites: 1, test: 1 };

export const useCertificateList = () => useTracker(() => {
  const handle = Meteor.subscribe('admin.certificates.list');
  return { loading: !handle.ready(), certificates: Certificates.find({}, { fields: LIST_FIELDS }).fetch() };
}, []);

/** One whole certificate, and every certificate (for prerequisites); no certificate without an id. */
export const useCertificate = (docId) => useTracker(() => {
  const list = Meteor.subscribe('admin.certificates.list');
  const one = docId ? Meteor.subscribe('admin.certificates.certificate', docId) : { ready: () => true };
  return {
    loading: !list.ready() || !one.ready(),
    certificate: docId ? Certificates.findOne(docId) : null,
    certificates: Certificates.find({}, { fields: LIST_FIELDS }).fetch(),
  };
}, [docId]);

/** The roles that may certify. */
export const useRoleOptions = () => useTracker(() => getRoleOptions(), []);

/** The form's values for a certificate, or empty ones for a new one. */
export const formValues = (certificate) => ({
  nameSv: certificate?.name?.sv || '',
  nameEn: certificate?.name?.en || '',
  descriptionSv: certificate?.description?.sv || '',
  descriptionEn: certificate?.description?.en || '',
  defaultValidityDays: certificate?.defaultValidityDays ?? '',
  certifierRole: certificate?.certifierRole || '',
  workshopId: certificate?.workshopId || '',
  certifiers: certificate?.certifiers || [],
  prerequisites: certificate?.prerequisites || [],
  testId: certificate?.test?.testId || '',
  maxAttempts: certificate?.test?.maxAttempts ?? 3,
  maxErrors: certificate?.test?.maxErrors ?? 1,
});

const fieldsFrom = (v) => ({
  name: { sv: v.nameSv, en: v.nameEn },
  description: { sv: v.descriptionSv, en: v.descriptionEn },
  defaultValidityDays: v.defaultValidityDays === '' ? null : Number(v.defaultValidityDays),
  certifierRole: v.certifierRole || null,
  workshopId: v.workshopId || null,
  certifiers: v.certifiers,
  prerequisites: v.prerequisites,
  test: v.testId ? { testId: v.testId, maxAttempts: Number(v.maxAttempts), maxErrors: Number(v.maxErrors) } : null,
});

/** Create a certificate (resolves to its id), or update one if a certificate is given. */
export const saveCertificate = (values, certificate) => (certificate
  ? Meteor.callAsync('certificates.update', certificate._id, fieldsFrom(values), certificate.updatedAt ?? null)
  : Meteor.callAsync('certificates.create', fieldsFrom(values)));

export const removeCertificate = (docId) => Meteor.callAsync('certificates.remove', docId);
export const markMandatory = (docId) => Meteor.callAsync('certificates.markMandatory', docId);
export const certificateHolders = (docId) => Meteor.callAsync('certificates.holders', docId);
export const memberCertificates = (memberId) => Meteor.callAsync('certificates.ofMember', memberId);
export const revokeAttestation = (attestationId) => Meteor.callAsync('certificates.revoke', attestationId);
export const defaultCertifier = () => Meteor.callAsync('certificates.defaultCertifier');

/** The tests a certificate can be awarded by; only admins may list them, so others get none. */
export const testIndex = () => Meteor.callAsync('tests.getIndex').then(
  (tests) => (tests || []).map((t) => ({ testId: t.testId, categoryCount: t.categories.length })),
  () => null,
);

export const testAttempts = (memberId) => Meteor.callAsync('tests.listAttemptsForMember', memberId).catch(() => null);
export const resetTestAttempts = (memberId, certificateId) => Meteor.callAsync('tests.resetAttempts', memberId, certificateId);

/** A day picked in a date field ("2026-10-19") as local midnight; none if empty. */
export const dayToDate = (day) => (day ? new Date(`${day}T00:00:00`) : null);

/** Grant a certificate; the dates are the form's days. */
export const grantAttestation = ({ certificateId, memberId, certifierId, startDay, endDay, comment }) => Meteor.callAsync('certificates.grant', {
  certificateId, memberId, certifierId, startDate: dayToDate(startDay), endDate: dayToDate(endDay), comment: comment || null,
});
