import { Meteor } from 'meteor/meteor';
import { Spaces } from '/imports/common/collections/spaces';
import { Workshops } from '/imports/common/collections/workshops';
import { Groups } from '/imports/common/collections/groups';
import { recordChange } from '/imports/common/server/auditLog';

/**
 * Spaces (ytor) in the premises, shown on the app's map. spaceId and floor
 * tie a space to the floor SVGs, which name their elements
 * `${spaceId}-marker` and `${spaceId}-floor`; the pair is unique. Workshops
 * and groups link to spaces as primary or secondary. Icons go through the
 * adminSpaces.*Icon methods.
 */

const DOMAIN = 'spaces';
const FLOORS = ['floor1', 'floor2'];

const text = (value) => (typeof value === 'string' ? value.trim() : '');

const changesOf = (fields) => {
  if (!FLOORS.includes(fields.floor)) throw new Meteor.Error('bad-floor', `Unknown floor "${fields.floor}"`);
  const $set = {
    spaceId: text(fields.spaceId),
    floor: fields.floor,
    name: { sv: text(fields.name?.sv), ...(text(fields.name?.en) ? { en: text(fields.name.en) } : {}) },
  };
  const $unset = {};
  const description = { ...(text(fields.description?.sv) ? { sv: text(fields.description.sv) } : {}), ...(text(fields.description?.en) ? { en: text(fields.description.en) } : {}) };
  if (Object.keys(description).length) $set.description = description; else $unset.description = '';
  const channels = (fields.slackChannels || []).map(text).filter(Boolean);
  if (channels.length) $set.slackChannels = channels; else $unset.slackChannels = '';
  if (typeof fields.iconSize === 'number' && !Number.isNaN(fields.iconSize)) $set.iconSize = fields.iconSize; else $unset.iconSize = '';
  return { $set, $unset };
};

const uniqueKey = async ({ spaceId, floor }, exceptId) => {
  if (await Spaces.findOneAsync({ spaceId, floor, ...(exceptId ? { _id: { $ne: exceptId } } : {}) })) {
    throw new Meteor.Error('duplicate-space', `There is already a space "${spaceId}" on ${floor}`);
  }
};

const linkSelector = (docId) => ({ $or: [{ primarySpaceId: docId }, { secondarySpaceIds: docId }] });

/** The workshops and groups that link to a space. */
export const spaceLinks = async (docId) => {
  const mark = (docs) => docs.map(({ _id, name, primarySpaceId }) => ({ _id, name, isPrimary: primarySpaceId === docId }));
  const fields = { fields: { name: 1, primarySpaceId: 1 } };
  return {
    workshops: mark(await Workshops.find(linkSelector(docId), fields).fetchAsync()),
    groups: mark(await Groups.find(linkSelector(docId), fields).fetchAsync()),
  };
};

/** @returns {Promise<string>} the new space's id */
export const createSpace = async (fields, { userId }) => {
  const { $set } = changesOf(fields);
  await uniqueKey($set);
  const now = new Date();
  const doc = { ...$set, createdAt: now, updatedAt: now };
  const docId = await Spaces.insertAsync(doc);
  await recordChange({ userId, domain: DOMAIN, action: 'create', docId, after: doc });
  return docId;
};

const current = async (docId, expectedUpdatedAt) => {
  const before = await Spaces.findOneAsync(docId);
  if (!before) throw new Meteor.Error('not-found', 'No such space');
  if (expectedUpdatedAt !== undefined
      && (before.updatedAt?.getTime() ?? null) !== (expectedUpdatedAt?.getTime() ?? null)) {
    throw new Meteor.Error('conflict', 'Someone else changed this space; reload it and try again');
  }
  return before;
};

/** Update a space, refused with 'conflict' if it changed since `expectedUpdatedAt`. */
export const updateSpace = async (docId, fields, { userId, expectedUpdatedAt }) => {
  const before = await current(docId, expectedUpdatedAt);
  const { $set, $unset } = changesOf(fields);
  await uniqueKey($set, docId);
  $set.updatedAt = new Date();
  await Spaces.updateAsync(docId, Object.keys($unset).length ? { $set, $unset } : { $set });
  await recordChange({ userId, domain: DOMAIN, action: 'update', docId, before, after: await Spaces.findOneAsync(docId) });
};

/**
 * Remove a space. Refused while a workshop or group links to it, or it has an
 * icon (remove that first, or its stored file is orphaned).
 */
export const removeSpace = async (docId, { userId }) => {
  const before = await current(docId);
  if (before.iconFileId) throw new Meteor.Error('has-icon', 'Remove the icon before the space can be deleted');
  const { workshops, groups } = await spaceLinks(docId);
  if (workshops.length || groups.length) {
    throw new Meteor.Error('linked', 'A workshop or group links to this space; remove the links first');
  }
  await Spaces.removeAsync(docId);
  await recordChange({ userId, domain: DOMAIN, action: 'remove', docId, before });
};
