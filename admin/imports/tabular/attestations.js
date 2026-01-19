import './initTabular';
import 'meteor/aldeed:collection2/static';
import Tabular from 'meteor/aldeed:tabular';
import { Roles } from 'meteor/roles';
import { Attestations } from '/imports/common/collections/attestations';
import { Certificates } from '/imports/common/collections/certificates';
import { Members } from '/imports/common/collections/members';
import { models } from "/imports/common/lib/models";
import { extractor, dateViewFunction } from "/imports/common/lib/fieldsUtils";

const endDateRenderer = dateViewFunction();

// Shared render functions
const renderEndDate = (value, type, doc) => {
  if (!value) return new Spacebars.SafeString('<span class="label label-success">No expiry</span>');
  return endDateRenderer(value);
};

const renderCertificate = (value, type, doc) => {
  const cert = Certificates.findOne(value);
  if (cert) {
    const name = cert.name ? (cert.name.sv || cert.name.en || '') : '';
    return new Spacebars.SafeString(`<a href="/certificate/${value}">${name}</a>`);
  }
  return value;
};

const renderMember = (value, type, doc) => {
  const member = Members.findOne(value);
  if (member) {
    return new Spacebars.SafeString(`<a href="/member/${value}">${member.name}</a>`);
  }
  return value;
};

const renderCertifier = (value, type, doc) => {
  const member = Members.findOne(value);
  if (member) {
    return member.name;
  }
  return value;
};

const renderActions = (value, type, doc) => {
  return new Spacebars.SafeString(`<button class="btn btn-xs btn-danger revokeAttestation" data-id="${doc._id}">Revoke</button>`);
};

// Shared changeSelector function for searching by member/certifier/certificate names
const createChangeSelector = (searchCollections) => async (selector, userId) => {
  let orConditions = selector.$or;
  if (selector.$and) {
    const orItem = selector.$and.find(item => item.$or);
    if (orItem) {
      orConditions = orItem.$or;
    }
  }

  if (orConditions && orConditions.length > 0) {
    let searchPattern = null;
    for (const condition of orConditions) {
      const field = Object.keys(condition)[0];
      if (condition[field] && condition[field].$regex) {
        searchPattern = condition[field].$regex;
        break;
      }
    }

    if (searchPattern) {
      if (searchCollections.members) {
        const matchingMembers = await Members.find(
          { name: { $regex: searchPattern, $options: 'i' } },
          { fields: { _id: 1 } }
        ).fetchAsync();
        const memberIds = matchingMembers.map(m => m._id);
        if (memberIds.length > 0) {
          orConditions.push({ memberId: { $in: memberIds } });
        }
      }

      if (searchCollections.certificates) {
        const matchingCerts = await Certificates.find(
          { $or: [
            { 'name.sv': { $regex: searchPattern, $options: 'i' } },
            { 'name.en': { $regex: searchPattern, $options: 'i' } }
          ]},
          { fields: { _id: 1 } }
        ).fetchAsync();
        const certIds = matchingCerts.map(c => c._id);
        if (certIds.length > 0) {
          orConditions.push({ certificateId: { $in: certIds } });
        }
      }
    }
  }
  return selector;
};

// For CertificateView - shows member column, hides certificate column
const attestationDefaults = {
  filter: ['comment', 'certificateId'],
  enhance: [
    { data: 'startDate', sortOrder: 0, sortDirection: 'descending', render: dateViewFunction(true) },
    { data: 'endDate', render: renderEndDate },
    { data: 'certificateId', render: renderCertificate },
    { data: 'memberId', render: renderMember },
    { data: 'certifierId', render: renderCertifier }
  ],
  append: [{ title: 'Actions', render: renderActions }]
};

// For MemberAttestations - shows certificate column, hides member column
const memberAttestationDefaults = {
  filter: ['comment', 'memberId'],
  enhance: [
    { data: 'startDate', sortOrder: 0, sortDirection: 'descending', render: dateViewFunction(true) },
    { data: 'endDate', render: renderEndDate },
    { data: 'certificateId', render: renderCertificate },
    { data: 'certifierId', render: renderCertifier }
  ],
  append: [{ title: 'Actions', render: renderActions }]
};

// For CertificateView - shows member column, hides certificate column
new Tabular.Table({
  name: "Attestations",
  autoWidth: false,
  collection: Attestations,
  order: [[0, "desc"]],
  columns: extractor(models.attestation, attestationDefaults),
  extraFields: ['certificateId', 'comment'],
  allow: (userID) => userID && Roles.userIsInRoleAsync(userID, 'admin'),
  changeSelector: createChangeSelector({ members: true })
});

// For MemberAttestations - shows certificate column, hides member column
new Tabular.Table({
  name: "MemberAttestations",
  autoWidth: false,
  collection: Attestations,
  order: [[0, "desc"]],
  columns: extractor(models.attestation, memberAttestationDefaults),
  extraFields: ['memberId', 'comment'],
  allow: (userID) => userID && Roles.userIsInRoleAsync(userID, 'admin'),
  changeSelector: createChangeSelector({ certificates: true, members: true })
});
