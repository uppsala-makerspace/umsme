import { Meteor } from 'meteor/meteor';
import { Workshops } from '/imports/common/collections/workshops';
import { Groups } from '/imports/common/collections/groups';
import { GroupMemberships } from '/imports/common/collections/groupMemberships';
import { Spaces } from '/imports/common/collections/spaces';
import { Certificates } from '/imports/common/collections/certificates';
import { WORKSHOP_KINDS, WORKSHOP_STATUSES } from '/imports/common/lib/groupRules';
import { recordChange } from '/imports/common/server/auditLog';
import { text, bilingual, setOrUnset } from '../groups/text';

/**
 * Workshops (verkstäder) and areas of interest (intresseområden): one
 * collection, told apart by kind. Each is run by one steering group
 * (groupId); certificates may belong to one (common/lib/groupRules.js for the
 * guideline's requirements).
 */

const DOMAIN = 'workshops';

const changesOf = async (fields) => {
  const kind = fields.kind || 'workshop';
  if (!WORKSHOP_KINDS.includes(kind)) throw new Meteor.Error('bad-kind', `Unknown kind "${kind}"`);
  const status = fields.status || 'forming';
  if (!WORKSHOP_STATUSES.includes(status)) throw new Meteor.Error('bad-status', `Unknown status "${status}"`);
  const groupId = text(fields.groupId);
  if (groupId && (await Groups.findOneAsync(groupId))?.type !== 'steering') {
    throw new Meteor.Error('bad-group', 'A workshop is run by a steering group');
  }
  const primarySpaceId = text(fields.primarySpaceId);
  const spaceIds = [...new Set([primarySpaceId, ...(fields.secondarySpaceIds || [])].filter(Boolean))];
  if (spaceIds.length && (await Spaces.find({ _id: { $in: spaceIds } }).countAsync()) !== spaceIds.length) {
    throw new Meteor.Error('not-found', 'No such space');
  }
  const changes = { $set: {}, $unset: {} };
  changes.$set.name = { sv: text(fields.name?.sv), ...(text(fields.name?.en) ? { en: text(fields.name.en) } : {}) };
  changes.$set.kind = kind;
  changes.$set.status = status;
  setOrUnset(changes, {
    tag: bilingual(fields.tag),
    description: bilingual(fields.description),
    rules: bilingual(fields.rules),
    slackChannel: text(fields.slackChannel),
    guidesUrl: text(fields.guidesUrl),
    groupId,
    primarySpaceId,
    secondarySpaceIds: spaceIds.filter((id) => id !== primarySpaceId),
  });
  return changes;
};

const current = async (docId, expectedUpdatedAt) => {
  const before = await Workshops.findOneAsync(docId);
  if (!before) throw new Meteor.Error('not-found', 'No such workshop');
  if (expectedUpdatedAt !== undefined
      && (before.updatedAt?.getTime() ?? null) !== (expectedUpdatedAt?.getTime() ?? null)) {
    throw new Meteor.Error('conflict', 'Someone else changed this workshop; reload it and try again');
  }
  return before;
};

/** @returns {Promise<string>} the new workshop's id */
export const createWorkshop = async (fields, { userId }) => {
  const { $set } = await changesOf(fields);
  const now = new Date();
  const doc = { ...$set, createdAt: now, updatedAt: now };
  const docId = await Workshops.insertAsync(doc);
  await recordChange({ userId, domain: DOMAIN, action: 'create', docId, after: doc });
  return docId;
};

/** Update a workshop, refused with 'conflict' if it changed since `expectedUpdatedAt`. */
export const updateWorkshop = async (docId, fields, { userId, expectedUpdatedAt }) => {
  const before = await current(docId, expectedUpdatedAt);
  const { $set, $unset } = await changesOf(fields);
  $set.updatedAt = new Date();
  await Workshops.updateAsync(docId, Object.keys($unset).length ? { $set, $unset } : { $set });
  await recordChange({ userId, domain: DOMAIN, action: 'update', docId, before, after: await Workshops.findOneAsync(docId) });
};

/** The steering group's active members and the certificates that belong to the workshop. */
export const workshopDetails = async (docId) => {
  const workshop = await current(docId);
  const activeMemberCount = workshop.groupId
    ? await GroupMemberships.find({ groupId: workshop.groupId, state: 'active' }).countAsync()
    : 0;
  const certificates = await Certificates.find({ workshopId: docId }, { fields: { name: 1 }, sort: { 'name.sv': 1 } }).fetchAsync();
  return { activeMemberCount, certificates };
};

/** Remove a workshop; refused while it has an image or certificates belong to it. */
export const removeWorkshop = async (docId, { userId }) => {
  const before = await current(docId);
  if (before.imageFileId) throw new Meteor.Error('has-image', 'Remove the image before the workshop can be deleted');
  if (await Certificates.findOneAsync({ workshopId: docId })) {
    throw new Meteor.Error('in-use', 'Certificates belong to this workshop; move them first');
  }
  await Workshops.removeAsync(docId);
  await recordChange({ userId, domain: DOMAIN, action: 'remove', docId, before });
};
