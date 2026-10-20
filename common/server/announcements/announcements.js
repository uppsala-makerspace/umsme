import { Meteor } from 'meteor/meteor';
import { Announcements } from '/imports/common/collections/announcements';
import { Mails } from '/imports/common/collections/mails';
import { Members } from '/imports/common/collections/members';
import { pushAnnouncement } from '/imports/common/server/push';
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

/** Mark an announcement sent, with the mail it went out as. */
export const markAnnouncementSent = async (docId, mailId, { userId }) => {
  const before = await current(docId);
  await Announcements.updateAsync(docId, { $set: { status: 'sent', sentAt: new Date(), mailId, updatedAt: new Date() } });
  await recordChange({ userId, domain: DOMAIN, action: 'markSent', docId, before, after: await Announcements.findOneAsync(docId) });
};

/**
 * An announcement made from a mail sent without one, so that it shows
 * among the announcements: sent when the mail was, its text the mail's.
 *
 * @returns {Promise<string>} the announcement's id
 */
export const announcementFromMail = async (mailId, { userId }) => {
  const mail = await Mails.findOneAsync(mailId);
  if (!mail) throw new Meteor.Error('not-found', 'No such mail');
  const existing = await Announcements.findOneAsync({ mailId }, { fields: { _id: 1 } });
  if (existing) return existing._id;
  const doc = {
    type: 'newsletter', subjectSv: mail.subject, subjectEn: mail.subject, bodySv: mail.template, bodyEn: mail.template,
    status: 'sent', createdAt: mail.senddate, sentAt: mail.senddate, updatedAt: new Date(), mailId,
  };
  const docId = await Announcements.insertAsync(doc);
  await recordChange({ userId, domain: DOMAIN, action: 'fromMail', docId, after: doc });
  return docId;
};

/** Push an announcement to every member not excluded; pushAnnouncement skips those who opted out. */
export const pushAnnouncementToMembers = async (docId) => {
  await current(docId);
  const members = await Members.find({ email: { $exists: true }, excluded: { $ne: true } }).fetchAsync();
  for (const member of members) await pushAnnouncement(member, docId);
  console.log(`[Push] Sent announcement push for ${docId}`);
};
