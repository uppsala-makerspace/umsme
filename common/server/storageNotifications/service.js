import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import { Messages } from '/imports/common/collections/messages';
import { schemas } from '/imports/common/lib/schemas';
import {
  StorageNotificationDeliveries,
} from '/imports/common/collections/storage';
import { isEmailAllowed } from '/imports/common/server/emailGuard';
import { journaledStorageOperation, storageOperationId } from '/imports/common/server/storage/journal';
import { isDuplicateKeyError } from '/imports/common/server/storage/errors';
import { normalizeSwedishMobile } from './phone';
import { renderStorageNotification } from './templates';
import { storageNotificationAdaptersFromSettings } from './adapters';

const LEASE_MS = 60_000;
const PROVIDER_TIMEOUT_MS = 45_000;
const PLACEHOLDER_ERROR = 'Storage notification rendering is not installed yet';
let adapterOverride;
let rendererOverride;
let providerTimeoutOverride;

const adapters = () => adapterOverride || storageNotificationAdaptersFromSettings();
const validEmail = (value) => typeof value === 'string' &&
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
const errorText = (error) => String(error?.message || error || 'Unknown delivery error').slice(0, 5000);
const deterministicMessageId = (deliveryId) =>
  `<storage-${String(deliveryId).replace(/[^a-zA-Z0-9_.-]/g, '-') }@uppsalamakerspace.se>`;
export const storageMessageRecordId = (deliveryId) => `storage-notification:${deliveryId}`;

const renderedSnapshotError = (rendered) => {
  if (typeof rendered.template_id !== 'string' || rendered.template_id.length > 100) return 'Rendered template id exceeds storage delivery limits';
  if (typeof rendered.sender_from !== 'string' || rendered.sender_from.length > 320) return 'Rendered sender exceeds storage delivery limits';
  if (typeof rendered.reply_to !== 'string' || rendered.reply_to.length > 320) return 'Rendered reply-to exceeds storage delivery limits';
  if (typeof rendered.subject !== 'string' || rendered.subject.length > 200) return 'Rendered subject exceeds message limits';
  if (typeof rendered.email !== 'string' || rendered.email.length > 10_000) return 'Rendered email exceeds message limits';
  if (typeof rendered.sms !== 'string' || rendered.sms.length > 2_000) return 'Rendered SMS exceeds delivery limits';
  return null;
};

const withProviderTimeout = async (send) => {
  const timeoutMs = Math.min(providerTimeoutOverride || PROVIDER_TIMEOUT_MS, LEASE_MS - 5_000);
  const controller = new AbortController();
  let timer;
  try {
    return await Promise.race([
      send(controller.signal),
      new Promise((resolve, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new Error(`Storage notification provider timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
};

/** Upgrade Phase 3 placeholders exactly once into immutable render snapshots. */
export const hydrateStorageNotification = async (deliveryId) => {
  const current = await StorageNotificationDeliveries.findOneAsync(deliveryId);
  if (!current || current.render_status === 'rendered' || current.render_error !== PLACEHOLDER_ERROR) return current;
  const rendered = current.render_context
    ? (rendererOverride || renderStorageNotification)(current.decision_type, current.render_context)
    : { status: 'render_failed', error: 'Missing immutable storage notification render context' };
  const snapshotError = rendered.status === 'rendered' && renderedSnapshotError(rendered);
  if (snapshotError) Object.assign(rendered, { status: 'render_failed', error: snapshotError });
  const now = new Date();
  if (rendered.status !== 'rendered') {
    await StorageNotificationDeliveries.updateAsync({
      _id: deliveryId, render_status: { $ne: 'rendered' },
    }, { $set: {
      render_status: rendered.status, render_error: rendered.error,
      email: { status: 'unavailable', attempts: current.email?.attempts || 0, last_error: rendered.error },
      sms: { status: 'unavailable', attempts: current.sms?.attempts || 0, last_error: rendered.error },
      updatedAt: now,
    } });
    return StorageNotificationDeliveries.findOneAsync(deliveryId);
  }
  const configured = adapters();
  const email = current.recipient_email?.trim();
  const mobile = normalizeSwedishMobile(current.recipient_mobile);
  const emailReady = validEmail(email);
  const smsReady = Boolean(mobile && configured.sms?.available);
  await StorageNotificationDeliveries.updateAsync({
    _id: deliveryId, render_status: { $ne: 'rendered' },
  }, { $set: {
    render_status: 'rendered', template_id: rendered.template_id,
    sender_from: rendered.sender_from, reply_to: rendered.reply_to,
    rendered_subject: rendered.subject, rendered_email: rendered.email, rendered_sms: rendered.sms,
    ...(email ? { recipient_email: email } : {}),
    ...(mobile ? { recipient_mobile: mobile } : {}),
    email: emailReady
      ? { status: 'pending', attempts: current.email?.attempts || 0 }
      : { status: 'unavailable', attempts: current.email?.attempts || 0, last_error: 'Missing or invalid email address' },
    sms: smsReady
      ? { status: 'pending', attempts: current.sms?.attempts || 0 }
      : { status: 'unavailable', attempts: current.sms?.attempts || 0,
        last_error: mobile ? 'SMS provider is disabled' : 'Missing or invalid Swedish mobile number' },
    updatedAt: now,
  }, $unset: { render_error: '' } });
  return StorageNotificationDeliveries.findOneAsync(deliveryId);
};

const claimChannel = async (deliveryId, channel, now = new Date()) => {
  const token = Random.id();
  const count = await StorageNotificationDeliveries.updateAsync({
    _id: deliveryId, render_status: 'rendered',
    $or: [
      { [`${channel}.status`]: 'pending' },
      { [`${channel}.status`]: 'sending', [`${channel}.lease_expires_at`]: { $lte: now } },
    ],
  }, { $set: {
    [`${channel}.status`]: 'sending', [`${channel}.claim_token`]: token,
    [`${channel}.last_attempt_at`]: now,
    [`${channel}.lease_expires_at`]: new Date(now.getTime() + LEASE_MS), updatedAt: now,
  }, $inc: { [`${channel}.attempts`]: 1 }, $unset: { [`${channel}.last_error`]: '' } });
  return count === 1 ? token : null;
};

const finishChannel = (deliveryId, channel, token, fields, now = new Date()) =>
  StorageNotificationDeliveries.updateAsync({
    _id: deliveryId, [`${channel}.status`]: 'sending', [`${channel}.claim_token`]: token,
  }, { $set: { ...fields, updatedAt: now }, $unset: {
    [`${channel}.lease_expires_at`]: '', [`${channel}.claim_token`]: '',
  } });

const ownsChannelClaim = async (deliveryId, channel, token) => Boolean(
  await StorageNotificationDeliveries.findOneAsync({
    _id: deliveryId, [`${channel}.status`]: 'sending', [`${channel}.claim_token`]: token,
  }, { fields: { _id: 1 } }),
);

const messageDocument = (delivery, sentAt) => ({
  _id: storageMessageRecordId(delivery._id),
  template: 'storage', member: delivery.owner, type: 'storage',
  to: delivery.recipient_email, subject: delivery.rendered_subject,
  senddate: sentAt, messagetext: delivery.rendered_email,
});

const validateMessageDocument = (document) => {
  const { _id, ...fields } = document;
  const context = schemas.message.newContext();
  if (!context.validate(fields)) {
    const errors = typeof context.validationErrors === 'function'
      ? context.validationErrors()
      : [];
    throw new Error(`Storage message snapshot is invalid: ${errors.map((item) => item.name).join(', ') || 'schema validation failed'}`);
  }
};

const assertMessageMatches = (existing, expected) => {
  for (const field of ['template', 'member', 'type', 'to', 'subject', 'messagetext']) {
    if (existing[field] !== expected[field]) {
      throw new Error(`Storage message conflict for ${expected._id}: ${field} does not match`);
    }
  }
};

const ensureMessage = async (delivery, sentAt) => {
  const expected = messageDocument(delivery, sentAt);
  validateMessageDocument(expected);
  const existing = await Messages.findOneAsync(expected._id);
  if (existing) {
    assertMessageMatches(existing, expected);
    return expected._id;
  }
  try {
    await Messages.insertAsync(expected);
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
    const raced = await Messages.findOneAsync(expected._id);
    if (!raced) throw error;
    assertMessageMatches(raced, expected);
  }
  return expected._id;
};

const deliverEmail = async (delivery, token) => {
  const now = new Date();
  const expectedMessage = messageDocument(delivery, now);
  validateMessageDocument(expectedMessage);
  const existingMessage = await Messages.findOneAsync(expectedMessage._id);
  if (existingMessage) assertMessageMatches(existingMessage, expectedMessage);
  if (!isEmailAllowed(delivery.recipient_email)) throw new Error('Email address is blocked by the configured whitelist');
  const emailAdapter = adapters().email;
  if (!emailAdapter?.available) throw new Error('Email delivery is unavailable');
  await withProviderTimeout((signal) => emailAdapter.send({
    to: delivery.recipient_email, from: delivery.sender_from, replyTo: delivery.reply_to,
    subject: delivery.rendered_subject, text: delivery.rendered_email,
    messageId: deterministicMessageId(delivery._id), idempotencyKey: delivery._id, signal,
  }));
  if (!await ownsChannelClaim(delivery._id, 'email', token)) return;
  const messageId = await ensureMessage(delivery, now);
  await finishChannel(delivery._id, 'email', token, {
    'email.status': 'sent', 'email.sent_at': now, message_id: messageId,
  }, now);
};

const deliverSms = async (delivery, token) => {
  const smsAdapter = adapters().sms;
  if (!smsAdapter?.available) throw new Error('SMS provider is disabled');
  const result = await withProviderTimeout((signal) => smsAdapter.send({
    to: delivery.recipient_mobile, text: delivery.rendered_sms,
    idempotencyKey: delivery._id, signal,
  }));
  if (!await ownsChannelClaim(delivery._id, 'sms', token)) return;
  const now = new Date();
  await finishChannel(delivery._id, 'sms', token, {
    'sms.status': 'sent', 'sms.sent_at': now,
    ...(result?.providerId ? { 'sms.provider_id': String(result.providerId) } : {}),
  }, now);
};

export const processStorageDeliveryChannel = async (deliveryId, channel) => {
  const token = await claimChannel(deliveryId, channel);
  if (!token) return false;
  const delivery = await StorageNotificationDeliveries.findOneAsync(deliveryId);
  try {
    if (channel === 'email') await deliverEmail(delivery, token);
    else if (channel === 'sms') await deliverSms(delivery, token);
    else throw new Meteor.Error('bad-channel', 'Unknown storage notification channel');
  } catch (error) {
    await finishChannel(deliveryId, channel, token, {
      [`${channel}.status`]: 'failed', [`${channel}.last_error`]: errorText(error),
    });
  }
  return true;
};

export const processStorageNotificationDelivery = async (deliveryId, { channels = ['email', 'sms'] } = {}) => {
  await hydrateStorageNotification(deliveryId);
  await Promise.all(channels.map((channel) => processStorageDeliveryChannel(deliveryId, channel)));
  return StorageNotificationDeliveries.findOneAsync(deliveryId);
};

export const processStorageNotificationQueue = async ({ limit = 25 } = {}) => {
  const now = new Date();
  const candidates = await StorageNotificationDeliveries.find({ $or: [
    { render_status: { $ne: 'rendered' }, render_error: PLACEHOLDER_ERROR },
    { 'email.status': 'pending' }, { 'email.status': 'sending', 'email.lease_expires_at': { $lte: now } },
    { 'sms.status': 'pending' }, { 'sms.status': 'sending', 'sms.lease_expires_at': { $lte: now } },
  ] }, { sort: { created_at: 1, _id: 1 }, limit }).fetchAsync();
  for (const delivery of candidates) await processStorageNotificationDelivery(delivery._id);
  return candidates.length;
};

const channelSummary = (delivery, channel) => ({
  status: delivery[channel].status, attempts: delivery[channel].attempts,
  ...(delivery[channel].last_error ? { last_error: delivery[channel].last_error } : {}),
  ...(delivery[channel].sent_at ? { sent_at: delivery[channel].sent_at } : {}),
  ...(delivery[channel].provider_id ? { provider_id: delivery[channel].provider_id } : {}),
});

export const retryStorageNotification = async ({ deliveryId, channels, actor, commandId }) => {
  const selected = [...new Set(channels)].sort();
  if (!selected.length || selected.some((channel) => !['render', 'email', 'sms'].includes(channel))) {
    throw new Meteor.Error('bad-channel', 'Select render, email and/or sms');
  }
  const delivery = await StorageNotificationDeliveries.findOneAsync(deliveryId);
  if (!delivery) throw new Meteor.Error('not-found', 'Storage notification not found');
  const id = storageOperationId('notification.retry', actor, commandId);
  await journaledStorageOperation({
    id, commandId, actionType: 'notification_retry', kind: 'notification.retry',
    targetType: 'storageNotificationDelivery', targetId: deliveryId, actor,
    payload: { deliveryId, channels: selected, actor },
    callerIntent: { kind: 'notification.retry', delivery_id: deliveryId, channels: selected, actor },
  }, async (journal) => {
    if (selected.includes('render')) {
      await journal.step('reset_render', async () => {
        await StorageNotificationDeliveries.updateAsync({
          _id: deliveryId, render_status: { $in: ['missing_template', 'render_failed'] },
        }, { $set: {
          render_status: 'render_failed', render_error: PLACEHOLDER_ERROR,
          email: { status: 'unavailable', attempts: delivery.email?.attempts || 0, last_error: 'Awaiting render retry' },
          sms: { status: 'unavailable', attempts: delivery.sms?.attempts || 0, last_error: 'Awaiting render retry' },
          updatedAt: new Date(),
        }, $unset: {
          template_id: '', sender_from: '', reply_to: '', rendered_subject: '', rendered_email: '', rendered_sms: '',
        } });
      });
    }
    for (const channel of selected) {
      if (channel === 'render') continue;
      await journal.step(`reset_${channel}`, async () => {
        await StorageNotificationDeliveries.updateAsync({
          _id: deliveryId, [`${channel}.status`]: 'failed',
        }, { $set: { [`${channel}.status`]: 'pending', updatedAt: new Date() },
          $unset: { [`${channel}.last_error`]: '' } });
      });
    }
    return { delivery_id: deliveryId };
  });
  const deliveryChannels = selected.includes('render') ? ['email', 'sms'] : selected;
  const current = await processStorageNotificationDelivery(deliveryId, { channels: deliveryChannels });
  return {
    delivery_id: deliveryId,
    ...(selected.includes('render') ? { render: { status: current.render_status, ...(current.render_error ? { error: current.render_error } : {}) } } : {}),
    channels: Object.fromEntries(deliveryChannels.map((channel) => [channel, channelSummary(current, channel)])),
  };
};

export const setStorageNotificationAdaptersForTests = (value) => { adapterOverride = value; };
export const setStorageNotificationRendererForTests = (value) => { rendererOverride = value; };
export const setStorageNotificationProviderTimeoutForTests = (value) => { providerTimeoutOverride = value; };
