import { Email } from 'meteor/email';
import { Meteor } from 'meteor/meteor';
import { Messages } from '/imports/common/collections/messages';
import { schemas } from '/imports/common/lib/schemas';
import { isEmailAllowed } from '/imports/common/server/emailGuard';
import { pushMessage } from '/imports/common/server/push';
import { isDuplicateKeyError } from '/imports/common/server/storage/errors';
import { validateStorageDocument } from '/imports/common/server/storage/db';
import { renderStorageNotification } from './templates';

let transportOverride;
const transports = () => transportOverride || {
  sendEmail: (options) => Email.sendAsync(options),
  sendPush: (messageId) => pushMessage(messageId),
};

export const storageMessageRecordId = (decisionType, decisionId) =>
  `storage-notification:${decisionType}:${decisionId}`;

const messageDocument = ({ owner, decisionType, decisionId, rendered, sentAt }) => ({
  _id: storageMessageRecordId(decisionType, decisionId),
  template: rendered.template_id,
  member: owner._id,
  type: 'storage',
  to: owner.email || 'In-app',
  subject: rendered.subject,
  senddate: sentAt,
  messagetext: rendered.email,
});

const validateMessageDocument = (document) => validateStorageDocument(schemas.message, document);

const assertMessageMatches = (existing, expected) => {
  for (const field of ['template', 'member', 'type', 'to', 'subject', 'messagetext']) {
    if (existing[field] !== expected[field]) {
      throw new Error(`Storage message conflict for ${expected._id}: ${field} does not match`);
    }
  }
};

/**
 * Use the established email, member-message, and app-push flow. Storage does
 * not keep a separate queue, channel state, delivery history, or retry ledger.
 * A member without email still gets the persistent in-app message.
 *
 * The text comes from the administrator-editable template of the decision's
 * type, so a message rendered once is compared by content on a retry: a
 * template edited between the two attempts is reported as a conflict rather
 * than silently sending a second, different message.
 */
export const sendStorageNotification = async ({
  owner,
  decisionType,
  decisionId,
  context,
  now = new Date(),
}) => {
  const rendered = await renderStorageNotification(decisionType, { ...context, owner });
  if (rendered.status !== 'rendered') throw new Error(rendered.error);
  const deliverEmail = Boolean(owner?.email && Meteor.settings.deliverMails);
  if (deliverEmail && !isEmailAllowed(owner.email)) {
    throw new Error('Email address is blocked by the configured whitelist');
  }

  const document = messageDocument({ owner, decisionType, decisionId, rendered, sentAt: now });
  validateMessageDocument(document);
  const existing = await Messages.findOneAsync(document._id);
  if (existing) {
    assertMessageMatches(existing, document);
    return existing._id;
  }

  try {
    await Messages.insertAsync(document);
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
    const raced = await Messages.findOneAsync(document._id);
    if (!raced) throw error;
    assertMessageMatches(raced, document);
  }
  try {
    await transports().sendPush(document._id);
  } catch (error) {
    console.error(`Storage push failed for ${document._id}: ${error.message}`);
  }
  if (deliverEmail) {
    try {
      await transports().sendEmail({
        to: owner.email,
        from: rendered.sender_from,
        replyTo: rendered.reply_to,
        subject: rendered.subject,
        text: rendered.email,
      });
    } catch (error) {
      console.error(`Storage email failed for ${document._id}: ${error.message}`);
    }
  }
  return document._id;
};

export const setStorageNotificationTransportsForTests = (value) => {
  transportOverride = value;
};
