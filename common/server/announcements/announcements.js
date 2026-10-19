import { Meteor } from 'meteor/meteor';
import { Announcements } from '/imports/common/collections/announcements';
import { Mails } from '/imports/common/collections/mails';
import { recordChange } from '/imports/common/server/auditLog';
import { text, setOrUnset } from '../groups/text';

/**
 * Announcements (utskick): a newsletter or a piece of information in Swedish
 * and English, written here as a draft. Sending is the mail module's: it
 * mails the announcement, then marks it sent with the mail's id.
 */

const DOMAIN = 'announcements';
export const ANNOUNCEMENT_TYPES = ['newsletter', 'information'];

const changesOf = (fields) => {
  if (!ANNOUNCEMENT_TYPES.includes(fields.type)) throw new Meteor.Error('bad-type', `Unknown announcement type "${fields.type}"`);
  const subjectSv = text(fields.subjectSv);
  const bodySv = text(fields.bodySv);
  if (!subjectSv || !bodySv) throw new Meteor.Error('bad-text', 'An announcement needs a Swedish subject and text');
  const changes = { $set: { type: fields.type, subjectSv, bodySv }, $unset: {} };
  setOrUnset(changes, { subjectEn: text(fields.subjectEn), bodyEn: text(fields.bodyEn) });
  return changes;
};

const current = async (docId, expectedUpdatedAt) => {
  const before = await Announcements.findOneAsync(docId);
  if (!before) throw new Meteor.Error('not-found', 'No such announcement');
  if (expectedUpdatedAt !== undefined
      && (before.updatedAt?.getTime() ?? null) !== (expectedUpdatedAt?.getTime() ?? null)) {
    throw new Meteor.Error('conflict', 'Someone else changed this announcement; reload it and try again');
  }
  return before;
};

/** @returns {Promise<string>} the new draft's id */
export const createAnnouncement = async (fields, { userId }) => {
  const { $set } = changesOf(fields);
  const now = new Date();
  const doc = { ...$set, status: 'draft', createdAt: now, updatedAt: now };
  const docId = await Announcements.insertAsync(doc);
  await recordChange({ userId, domain: DOMAIN, action: 'create', docId, after: doc });
  return docId;
};

/**
 * Update the text, refused with 'conflict' if it changed since
 * `expectedUpdatedAt`. A sent announcement may be edited too; what was
 * already mailed stays as it was.
 */
export const updateAnnouncement = async (docId, fields, { userId, expectedUpdatedAt }) => {
  const before = await current(docId, expectedUpdatedAt);
  const { $set, $unset } = changesOf(fields);
  $set.updatedAt = new Date();
  await Announcements.updateAsync(docId, Object.keys($unset).length ? { $set, $unset } : { $set });
  await recordChange({ userId, domain: DOMAIN, action: 'update', docId, before, after: await Announcements.findOneAsync(docId) });
};

/** Remove an announcement and the record of its mail; mail already delivered stays delivered. */
export const removeAnnouncement = async (docId, { userId }) => {
  const before = await current(docId);
  if (before.mailId) await Mails.removeAsync(before.mailId);
  await Announcements.removeAsync(docId);
  await recordChange({ userId, domain: DOMAIN, action: 'remove', docId, before });
};
