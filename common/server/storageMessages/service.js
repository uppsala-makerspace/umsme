import { Email } from 'meteor/email';
import { Messages } from '/imports/common/collections/messages';
import { schemas } from '/imports/common/lib/schemas';
import { isEmailAllowed } from '/imports/common/server/emailGuard';
import { pushMessage } from '/imports/common/server/push';
import { isDuplicateKeyError } from '/imports/common/server/storage/errors';
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
  template: 'storage',
  member: owner._id,
  type: 'storage',
  to: owner.email || 'In-app',
  subject: rendered.subject,
  senddate: sentAt,
  messagetext: rendered.email,
});

const validateMessageDocument = (document) => {
  const { _id, ...fields } = document;
  const context = schemas.message.newContext();
  if (!context.validate(fields)) {
    const errors = typeof context.validationErrors === 'function'
      ? context.validationErrors()
      : [];
    throw new Error(`Storage message is invalid: ${errors.map((item) => item.name).join(', ') || 'schema validation failed'}`);
  }
};

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
 */
export const sendStorageNotification = async ({
  owner,
  decisionType,
  decisionId,
  context,
  now = new Date(),
}) => {
  const rendered = renderStorageNotification(decisionType, context);
  if (rendered.status !== 'rendered') throw new Error(rendered.error);
  if (owner?.email && !isEmailAllowed(owner.email)) {
    throw new Error('Email address is blocked by the configured whitelist');
  }

  const document = messageDocument({ owner, decisionType, decisionId, rendered, sentAt: now });
  validateMessageDocument(document);
  const existing = await Messages.findOneAsync(document._id);
  if (existing) {
    assertMessageMatches(existing, document);
    return existing._id;
  }

  if (owner.email) {
    await transports().sendEmail({
      to: owner.email,
      from: rendered.sender_from,
      replyTo: rendered.reply_to,
      subject: rendered.subject,
      text: rendered.email,
    });
  }

  try {
    await Messages.insertAsync(document);
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
    const raced = await Messages.findOneAsync(document._id);
    if (!raced) throw error;
    assertMessageMatches(raced, document);
  }
  await transports().sendPush(document._id);
  return document._id;
};

export const setStorageNotificationTransportsForTests = (value) => {
  transportOverride = value;
};
