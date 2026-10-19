import { Meteor } from 'meteor/meteor';
import { Comments } from '/imports/common/collections/comments';
import { recordChange } from '/imports/common/server/auditLog';

/**
 * Comments (kommentarer): notes admin and board keep about a member, a
 * payment, a membership, a mail, a user or a template, by its id.
 */

const DOMAIN = 'comments';
const textOf = (text) => {
  const clean = String(text || '').trim();
  if (!clean) throw new Meteor.Error('bad-text', 'A comment needs some text');
  return clean;
};

/** @returns {Promise<string>} the new comment's id */
export const addComment = async (about, text, { userId }) => {
  const doc = { about, text: textOf(text), created: new Date() };
  const docId = await Comments.insertAsync(doc);
  await recordChange({ userId, domain: DOMAIN, action: 'create', docId, after: doc });
  return docId;
};

export const updateComment = async (docId, text, { userId }) => {
  const before = await Comments.findOneAsync(docId);
  if (!before) throw new Meteor.Error('not-found', 'No such comment');
  await Comments.updateAsync(docId, { $set: { text: textOf(text), modified: new Date() } });
  await recordChange({ userId, domain: DOMAIN, action: 'update', docId, before, after: await Comments.findOneAsync(docId) });
};

export const removeComment = async (docId, { userId }) => {
  const before = await Comments.findOneAsync(docId);
  if (!before) throw new Meteor.Error('not-found', 'No such comment');
  await Comments.removeAsync(docId);
  await recordChange({ userId, domain: DOMAIN, action: 'remove', docId, before });
};
