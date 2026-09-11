import assert from 'assert';
import { Members } from '/imports/common/collections/members';
import { Messages } from '/imports/common/collections/messages';
import { isStorageGeneratedMessage } from '/imports/common/collections/messages';
import {
  StorageUnits,
  StorageAssignments,
  StorageNotificationDeliveries,
  StorageActionExecutions,
} from '/imports/common/collections/storage';
import { renderStorageNotification, STORAGE_NOTIFICATION_FROM, STORAGE_NOTIFICATION_REPLY_TO } from
  '/imports/common/server/storageNotifications/templates';
import { normalizeSwedishMobile } from '/imports/common/server/storageNotifications/phone';
import {
  hydrateStorageNotification,
  processStorageNotificationDelivery,
  processStorageNotificationQueue,
  retryStorageNotification,
  storageMessageRecordId,
  setStorageNotificationAdaptersForTests,
  setStorageNotificationProviderTimeoutForTests,
  setStorageNotificationRendererForTests,
} from '/imports/common/server/storageNotifications/service';
import { emailOptionsForStorageMessage } from '/imports/common/server/storageNotifications/adapters';
import { runStorageNotificationWorker, stopStorageNotificationWorkerForTests } from
  '/imports/common/server/storageNotifications/worker';

const prefix = 'storage-notification-test:';
const placeholder = 'Storage notification rendering is not installed yet';

const cleanup = async () => {
  await StorageNotificationDeliveries.removeAsync({ _id: { $regex: `^${prefix}` } });
  await StorageAssignments.removeAsync({ _id: { $regex: `^${prefix}` } });
  await StorageUnits.removeAsync({ _id: { $regex: `^${prefix}` } });
  await StorageActionExecutions.removeAsync({ target_id: { $regex: `^${prefix}` } });
  await Messages.removeAsync({ _id: { $regex: `^${prefix}` } });
  await Messages.removeAsync({ _id: { $regex: `^storage-notification:${prefix}` } });
  await Members.removeAsync({ _id: { $regex: `^${prefix}` } });
};

const insertAssignmentDelivery = async () => {
  const created = new Date('2026-09-10T12:00:00.000Z');
  const owner = `${prefix}owner`;
  const unit = `${prefix}unit`;
  const assignment = `${prefix}assignment`;
  const delivery = `${prefix}delivery`;
  await Members.insertAsync({ _id: owner, mid: 'snt1', name: 'Anna Andersson', email: 'anna@example.com', mobile: '070-123 45 67' });
  await StorageUnits.insertAsync({
    _id: unit, name: 'F1-L42', floor: 'floor1', height: 'low', wall_id: 'snt-wall', column: 42, row: 1,
    availability_status: 'occupied', owner, createdAt: created, updatedAt: created,
  });
  await StorageAssignments.insertAsync({
    _id: assignment, unit, owner, assigned_at: created, assigned_by: 'admin', createdAt: created, updatedAt: created,
  });
  await StorageNotificationDeliveries.insertAsync({
    _id: delivery, owner, decision_type: 'assignment', decision_id: assignment,
    recipient_email: 'anna@example.com', recipient_mobile: '070-123 45 67',
    render_context: { owner_name: 'Anna Andersson', unit_name: 'F1-L42' },
    render_status: 'render_failed', render_error: placeholder,
    email: { status: 'unavailable', attempts: 0, last_error: 'Delivery phase not installed' },
    sms: { status: 'unavailable', attempts: 0, last_error: 'Delivery phase not installed' },
    created_at: created, created_by: 'admin', updatedAt: created,
  });
  return { owner, delivery };
};

describe('storage notification delivery', function () {
  beforeEach(cleanup);
  afterEach(async () => {
    setStorageNotificationAdaptersForTests(undefined);
    setStorageNotificationRendererForTests(undefined);
    setStorageNotificationProviderTimeoutForTests(undefined);
    stopStorageNotificationWorkerForTests();
    await cleanup();
  });

  it('renders every emitted decision type with the fixed sender identity', function () {
    for (const type of [
      'assignment', 'move', 'warning', 'reminder', 'reclamation', 'voluntary_release',
    ]) {
      const rendered = renderStorageNotification(type, {
        owner_name: 'Anna', unit_name: 'F1-L42', deadline_at: new Date('2026-10-01T00:00:00Z'),
      });
      assert.strictEqual(rendered.status, 'rendered');
      assert.strictEqual(rendered.sender_from, STORAGE_NOTIFICATION_FROM);
      assert.strictEqual(rendered.reply_to, STORAGE_NOTIFICATION_REPLY_TO);
      assert(rendered.subject && rendered.email && rendered.sms);
      assert.match(rendered.subject, / — /);
      assert.match(rendered.email, /\n\n---\n\n/);
      assert.match(rendered.sms, / — /);
    }
    assert.strictEqual(renderStorageNotification('unknown').status, 'missing_template');
  });

  it('renders deadlines in Swedish and English in the corresponding message blocks', function () {
    const rendered = renderStorageNotification('move', {
      owner_name: 'Anna', unit_name: '1001', deadline_at: new Date('2026-10-01T00:00:00Z'),
    });
    assert.match(rendered.email, /1 oktober 2026/);
    assert.match(rendered.email, /1 October 2026/);
    assert.match(rendered.email, /You are in the queue to change storage units/);
    assert.match(rendered.sms, /New storage unit \(1001\) is reserved/);
  });

  it('normalizes only valid Swedish mobile numbers to E.164', function () {
    assert.strictEqual(normalizeSwedishMobile('070-123 45 67'), '+46701234567');
    assert.strictEqual(normalizeSwedishMobile('0046 70 123 45 67'), '+46701234567');
    assert.strictEqual(normalizeSwedishMobile('+46 (0)70 123 45 67'), null);
    assert.strictEqual(normalizeSwedishMobile('018-12 34 56'), null);
  });

  it('passes the deterministic Message-ID as a top-level Meteor Email option', function () {
    const options = emailOptionsForStorageMessage({
      to: 'anna@example.com', from: 'sender@example.com', replyTo: 'reply@example.com',
      subject: 'Subject', text: 'Body', messageId: '<storage-id@example.com>', idempotencyKey: 'delivery-1',
    });
    assert.strictEqual(options.messageId, '<storage-id@example.com>');
    assert.strictEqual(options.headers['X-Storage-Delivery-ID'], 'delivery-1');
    assert.strictEqual(options.headers['Message-ID'], undefined);
  });

  it('recognizes only deterministic storage history rows as server-owned', function () {
    assert.strictEqual(isStorageGeneratedMessage({ _id: 'storage-notification:delivery-1' }), true);
    assert.strictEqual(isStorageGeneratedMessage({ _id: 'ordinary-message' }), false);
  });

  it('hydrates a Phase 3 placeholder and delivers email and SMS independently', async function () {
    const { owner, delivery } = await insertAssignmentDelivery();
    const calls = { email: 0, sms: 0 };
    setStorageNotificationAdaptersForTests({
      email: { available: true, send: async (message) => {
        calls.email += 1;
        assert.strictEqual(message.idempotencyKey, delivery);
        assert(message.messageId.endsWith('@uppsalamakerspace.se>'));
      } },
      sms: { available: true, send: async () => { calls.sms += 1; throw new Error('provider down'); } },
    });
    let result = await processStorageNotificationDelivery(delivery);
    assert.strictEqual(result.render_status, 'rendered');
    assert.strictEqual(result.recipient_mobile, '+46701234567');
    assert.strictEqual(result.email.status, 'sent');
    assert.strictEqual(result.sms.status, 'failed');
    assert.strictEqual(await Messages.find({ member: owner, type: 'storage' }).countAsync(), 1);
    assert.strictEqual(result.message_id, storageMessageRecordId(delivery));
    await processStorageNotificationQueue();
    assert.strictEqual(calls.sms, 1, 'background processing must not retry a failed channel');

    setStorageNotificationAdaptersForTests({
      email: { available: true, send: async () => { throw new Error('sent email must not retry'); } },
      sms: { available: true, send: async ({ idempotencyKey }) => {
        calls.sms += 1; return { providerId: `provider:${idempotencyKey}` };
      } },
    });
    result = await retryStorageNotification({
      deliveryId: delivery, channels: ['email', 'sms'], actor: 'admin', commandId: `${prefix}retry-1`,
    });
    assert.strictEqual(result.channels.email.status, 'sent');
    assert.strictEqual(result.channels.sms.status, 'sent');
    assert.strictEqual(calls.email, 1);
    assert.strictEqual(calls.sms, 2);
    assert.strictEqual(await Messages.find({ member: owner, type: 'storage' }).countAsync(), 1);
    const exactRetry = await retryStorageNotification({
      deliveryId: delivery, channels: ['sms', 'email'], actor: 'admin', commandId: `${prefix}retry-1`,
    });
    assert.strictEqual(exactRetry.channels.sms.status, 'sent');
    assert.strictEqual(calls.sms, 2);
  });

  it('does not let a hostile precreated message suppress provider delivery', async function () {
    const { owner, delivery } = await insertAssignmentDelivery();
    await hydrateStorageNotification(delivery);
    await Messages.insertAsync({
      _id: storageMessageRecordId(delivery), template: 'storage', member: owner, type: 'storage',
      to: 'attacker@example.com', subject: 'Forged', senddate: new Date(), messagetext: 'Forged',
    });
    let sends = 0;
    setStorageNotificationAdaptersForTests({
      email: { available: true, send: async () => { sends += 1; } },
      sms: { available: false, send: async () => {} },
    });
    const result = await processStorageNotificationDelivery(delivery, { channels: ['email'] });
    assert.strictEqual(sends, 0);
    assert.strictEqual(result.email.status, 'failed');
    assert.match(result.email.last_error, /message conflict/i);
  });

  it('still calls the provider when an exact deterministic message row already exists', async function () {
    const { owner, delivery } = await insertAssignmentDelivery();
    const snapshot = await hydrateStorageNotification(delivery);
    await Messages.insertAsync({
      _id: storageMessageRecordId(delivery), template: 'storage', member: owner, type: 'storage',
      to: snapshot.recipient_email, subject: snapshot.rendered_subject,
      senddate: new Date('2026-09-10T12:01:00Z'), messagetext: snapshot.rendered_email,
    });
    let sends = 0;
    setStorageNotificationAdaptersForTests({
      email: { available: true, send: async () => { sends += 1; } },
      sms: { available: false, send: async () => {} },
    });
    const result = await processStorageNotificationDelivery(delivery, { channels: ['email'] });
    assert.strictEqual(sends, 1);
    assert.strictEqual(result.email.status, 'sent');
    assert.strictEqual(await Messages.find({ _id: storageMessageRecordId(delivery) }).countAsync(), 1);
  });

  it('rejects a message row mutated during provider delivery', async function () {
    const { owner, delivery } = await insertAssignmentDelivery();
    await hydrateStorageNotification(delivery);
    setStorageNotificationAdaptersForTests({
      email: { available: true, send: async () => {
        await Messages.insertAsync({
          _id: storageMessageRecordId(delivery), template: 'storage', member: owner, type: 'storage',
          to: 'mutated@example.com', subject: 'Mutated', senddate: new Date(), messagetext: 'Mutated',
        });
      } },
      sms: { available: false, send: async () => {} },
    });
    const result = await processStorageNotificationDelivery(delivery, { channels: ['email'] });
    assert.strictEqual(result.email.status, 'failed');
    assert.match(result.email.last_error, /message conflict/i);
    assert.strictEqual(result.message_id, undefined);
  });

  it('claims a pending channel once under concurrent workers', async function () {
    const { delivery } = await insertAssignmentDelivery();
    let sends = 0;
    setStorageNotificationAdaptersForTests({
      email: { available: true, send: async () => { sends += 1; } },
      sms: { available: false, send: async () => {} },
    });
    await hydrateStorageNotification(delivery);
    await Promise.all([
      processStorageNotificationDelivery(delivery, { channels: ['email'] }),
      processStorageNotificationDelivery(delivery, { channels: ['email'] }),
    ]);
    assert.strictEqual(sends, 1);
    assert.strictEqual((await StorageNotificationDeliveries.findOneAsync(delivery)).email.attempts, 1);
  });

  it('coalesces overlapping process-local worker runs', async function () {
    const { delivery } = await insertAssignmentDelivery();
    let sends = 0;
    setStorageNotificationAdaptersForTests({
      email: { available: true, send: async () => {
        sends += 1;
        await new Promise((resolve) => setTimeout(resolve, 20));
      } },
      sms: { available: false, send: async () => {} },
    });
    const [first, second] = await Promise.all([
      runStorageNotificationWorker(), runStorageNotificationWorker(),
    ]);
    assert.strictEqual(first, 1);
    assert.strictEqual(second, 1);
    assert.strictEqual(sends, 1);
    assert.strictEqual((await StorageNotificationDeliveries.findOneAsync(delivery)).email.status, 'sent');
  });

  it('takes over an expired channel lease', async function () {
    const { delivery } = await insertAssignmentDelivery();
    let sends = 0;
    setStorageNotificationAdaptersForTests({
      email: { available: true, send: async () => { sends += 1; } },
      sms: { available: false, send: async () => {} },
    });
    await hydrateStorageNotification(delivery);
    await StorageNotificationDeliveries.updateAsync(delivery, { $set: {
      'email.status': 'sending', 'email.claim_token': 'abandoned',
      'email.lease_expires_at': new Date(Date.now() - 1000),
    } });
    await processStorageNotificationDelivery(delivery, { channels: ['email'] });
    const result = await StorageNotificationDeliveries.findOneAsync(delivery);
    assert.strictEqual(result.email.status, 'sent');
    assert.strictEqual(result.email.attempts, 1);
    assert.strictEqual(sends, 1);
  });

  it('times out one provider without blocking the other channel', async function () {
    const { delivery } = await insertAssignmentDelivery();
    setStorageNotificationProviderTimeoutForTests(10);
    let smsSends = 0;
    setStorageNotificationAdaptersForTests({
      email: { available: true, send: async () => new Promise(() => {}) },
      sms: { available: true, send: async () => { smsSends += 1; return { providerId: 'sms-1' }; } },
    });
    const started = Date.now();
    const result = await processStorageNotificationDelivery(delivery);
    assert(Date.now() - started < 1000);
    assert.strictEqual(result.email.status, 'failed');
    assert.match(result.email.last_error, /timed out/i);
    assert.strictEqual(result.sms.status, 'sent');
    assert.strictEqual(smsSends, 1);
  });

  it('does not persist an old provider result after its claim token is lost', async function () {
    const { delivery } = await insertAssignmentDelivery();
    await hydrateStorageNotification(delivery);
    setStorageNotificationAdaptersForTests({
      email: { available: true, send: async () => {
        await StorageNotificationDeliveries.updateAsync(delivery, { $set: {
          'email.claim_token': 'new-owner',
          'email.lease_expires_at': new Date(Date.now() + 60_000),
        } });
      } },
      sms: { available: false, send: async () => {} },
    });
    const result = await processStorageNotificationDelivery(delivery, { channels: ['email'] });
    assert.strictEqual(result.email.status, 'sending');
    assert.strictEqual(result.email.claim_token, 'new-owner');
    assert.strictEqual(await Messages.find({ _id: storageMessageRecordId(delivery) }).countAsync(), 0);
  });

  it('stores a missing-template failure durably without invented content', async function () {
    const { delivery } = await insertAssignmentDelivery();
    setStorageNotificationRendererForTests(() => ({ status: 'missing_template', error: 'Template removed' }));
    const result = await hydrateStorageNotification(delivery);
    assert.strictEqual(result.render_status, 'missing_template');
    assert.strictEqual(result.render_error, 'Template removed');
    assert.strictEqual(result.email.status, 'unavailable');
    assert.strictEqual(result.sms.status, 'unavailable');
    assert.strictEqual(result.rendered_email, undefined);
    assert.strictEqual(result.sender_from, undefined);
  });

  it('recovers an explicit render failure only through an administrator retry', async function () {
    const { delivery } = await insertAssignmentDelivery();
    setStorageNotificationRendererForTests(() => ({ status: 'missing_template', error: 'Template removed' }));
    await processStorageNotificationDelivery(delivery);
    await processStorageNotificationQueue();
    assert.strictEqual((await StorageNotificationDeliveries.findOneAsync(delivery)).render_status, 'missing_template');

    setStorageNotificationRendererForTests(undefined);
    setStorageNotificationAdaptersForTests({
      email: { available: true, send: async () => {} },
      sms: { available: false, send: async () => {} },
    });
    const result = await retryStorageNotification({
      deliveryId: delivery, channels: ['render'], actor: 'admin', commandId: `${prefix}render-retry`,
    });
    assert.strictEqual(result.render.status, 'rendered');
    assert.strictEqual(result.channels.email.status, 'sent');
  });

  it('rejects an oversized rendered message before calling a provider', async function () {
    const { delivery } = await insertAssignmentDelivery();
    let sends = 0;
    setStorageNotificationRendererForTests(() => ({
      status: 'rendered', template_id: 'storage_assignment',
      sender_from: STORAGE_NOTIFICATION_FROM, reply_to: STORAGE_NOTIFICATION_REPLY_TO,
      subject: 'x'.repeat(201), email: 'Body', sms: 'SMS',
    }));
    setStorageNotificationAdaptersForTests({
      email: { available: true, send: async () => { sends += 1; } },
      sms: { available: true, send: async () => {} },
    });
    const result = await processStorageNotificationDelivery(delivery);
    assert.strictEqual(result.render_status, 'render_failed');
    assert.match(result.render_error, /subject exceeds/i);
    assert.strictEqual(sends, 0);
  });

  it('persists rendered content at the exact member-message size limits', async function () {
    const { delivery } = await insertAssignmentDelivery();
    setStorageNotificationRendererForTests(() => ({
      status: 'rendered', template_id: 'storage_assignment',
      sender_from: STORAGE_NOTIFICATION_FROM, reply_to: STORAGE_NOTIFICATION_REPLY_TO,
      subject: 's'.repeat(200), email: 'b'.repeat(10_000), sms: 'SMS',
    }));
    setStorageNotificationAdaptersForTests({
      email: { available: true, send: async () => {} },
      sms: { available: false, send: async () => {} },
    });
    const result = await processStorageNotificationDelivery(delivery, { channels: ['email'] });
    assert.strictEqual(result.email.status, 'sent');
    const message = await Messages.findOneAsync(storageMessageRecordId(delivery));
    assert.strictEqual(message.subject.length, 200);
    assert.strictEqual(message.messagetext.length, 10_000);
  });

});
