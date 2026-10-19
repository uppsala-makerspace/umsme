import { Meteor } from 'meteor/meteor';
import { MessageTemplates } from '/imports/common/collections/templates';
import { recordChange } from '/imports/common/server/auditLog';
import { testTemplates, TEMPLATE_TYPES } from '/imports/common/lib/messageTemplates';

/**
 * Message templates. Mail and app messages pick one with findBestTemplate()
 * (common/lib/message.js) by type, membership type, member type and the
 * Automatic flag, skipping deprecated ones.
 */

const DOMAIN = 'messageTemplates';
const TYPES = TEMPLATE_TYPES.map(({ value }) => value);

/** The stored fields; an empty membership or member type means "any". */
const fieldsOf = ({ name, type, membershiptype, membertype, subject, messagetext, auto, deprecated }) => {
  if (!TYPES.includes(type)) throw new Meteor.Error('bad-type', `Unknown message type "${type}"`);
  const result = testTemplates({ subject, messagetext });
  if (result.hasError) throw new Meteor.Error('invalid-template', result.message);
  return {
    name: name.trim(),
    type,
    subject,
    messagetext,
    auto: !!auto,
    deprecated: !!deprecated,
    ...(membershiptype ? { membershiptype } : {}),
    ...(membertype ? { membertype } : {}),
  };
};

/** @returns {Promise<string>} the new template's id */
export const createMessageTemplate = async (fields, { userId }) => {
  const now = new Date();
  const doc = { ...fieldsOf({ ...fields, deprecated: false }), created: now, modified: now };
  const docId = await MessageTemplates.insertAsync(doc);
  await recordChange({ userId, domain: DOMAIN, action: 'create', docId, after: doc });
  return docId;
};

/**
 * Update a template. `expectedModified` is the `modified` the editor loaded;
 * if the template has changed since, the update is refused with 'conflict'.
 */
export const updateMessageTemplate = async (docId, fields, { userId, expectedModified }) => {
  const before = await MessageTemplates.findOneAsync(docId);
  if (!before) throw new Meteor.Error('not-found', 'No such message template');
  if (expectedModified !== undefined
      && (before.modified?.getTime() ?? null) !== (expectedModified?.getTime() ?? null)) {
    throw new Meteor.Error('conflict', 'Someone else changed this template; reload it and try again');
  }
  const next = fieldsOf(fields);
  const $set = { ...next, modified: new Date() };
  const $unset = {};
  for (const field of ['membershiptype', 'membertype']) if (!next[field]) $unset[field] = '';
  await MessageTemplates.updateAsync(docId, Object.keys($unset).length ? { $set, $unset } : { $set });
  const after = { ...before, ...$set };
  for (const field of Object.keys($unset)) delete after[field];
  await recordChange({ userId, domain: DOMAIN, action: 'update', docId, before, after });
};

export const removeMessageTemplate = async (docId, { userId }) => {
  const before = await MessageTemplates.findOneAsync(docId);
  if (!before) throw new Meteor.Error('not-found', 'No such message template');
  await MessageTemplates.removeAsync(docId);
  await recordChange({ userId, domain: DOMAIN, action: 'remove', docId, before });
};
