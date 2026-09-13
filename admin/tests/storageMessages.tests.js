import assert from 'assert';
import { Meteor } from 'meteor/meteor';
import { Messages, isStorageGeneratedMessage } from '/imports/common/collections/messages';
import {
  sendStorageNotification,
  setStorageNotificationTransportsForTests,
  storageMessageRecordId,
} from '/imports/common/server/storageMessages/service';
import {
  renderStorageNotification,
  STORAGE_NOTIFICATION_FROM,
  STORAGE_NOTIFICATION_REPLY_TO,
} from '/imports/common/server/storageMessages/templates';

const decisionId = 'storage-message-test:assignment';
const messageId = storageMessageRecordId('assignment', decisionId);

describe('storage messages', function () {
  let originalDeliverMails;

  beforeEach(function () {
    originalDeliverMails = Meteor.settings.deliverMails;
    Meteor.settings.deliverMails = true;
  });

  afterEach(async () => {
    Meteor.settings.deliverMails = originalDeliverMails;
    setStorageNotificationTransportsForTests(undefined);
    await Messages.removeAsync(messageId);
  });

  it('renders every automatic message in Swedish and English without SMS content', function () {
    for (const type of ['assignment', 'move', 'warning', 'reminder', 'reclamation', 'voluntary_release']) {
      const rendered = renderStorageNotification(type, {
        owner_name: 'Anna', unit_name: '1001', deadline_at: new Date('2026-10-01T00:00:00Z'),
      });
      assert.strictEqual(rendered.status, 'rendered');
      assert.strictEqual(rendered.sender_from, STORAGE_NOTIFICATION_FROM);
      assert.strictEqual(rendered.reply_to, STORAGE_NOTIFICATION_REPLY_TO);
      assert.match(rendered.subject, / — /);
      assert.match(rendered.email, /\n\n---\n\n/);
      assert.strictEqual(rendered.sms, undefined);
    }
  });

  it('uses one existing Messages row and sends email and app push once', async function () {
    const calls = { email: 0, push: 0 };
    setStorageNotificationTransportsForTests({
      sendEmail: async () => { calls.email += 1; },
      sendPush: async (id) => { calls.push += 1; assert.strictEqual(id, messageId); },
    });
    const input = {
      owner: { _id: 'storage-message-test:owner', name: 'Anna', email: 'anna@example.com' },
      decisionType: 'assignment', decisionId,
      context: { owner_name: 'Anna', unit_name: '1001' },
      now: new Date('2026-09-10T12:00:00.000Z'),
    };
    assert.strictEqual(await sendStorageNotification(input), messageId);
    assert.strictEqual(await sendStorageNotification(input), messageId);
    assert.deepStrictEqual(calls, { email: 1, push: 1 });
    const message = await Messages.findOneAsync(messageId);
    assert.strictEqual(message.type, 'storage');
    assert.strictEqual(message.member, input.owner._id);
    assert.match(message.messagetext, /Du är i kö för en hyllplats/);
    assert.match(message.messagetext, /You are in the queue for a storage unit/);
    assert.strictEqual(isStorageGeneratedMessage(message), true);
  });

  it('keeps the app message and push but does not send email when delivery is disabled', async function () {
    Meteor.settings.deliverMails = false;
    const disabledDecisionId = 'storage-message-test:delivery-disabled';
    const disabledMessageId = storageMessageRecordId('warning', disabledDecisionId);
    const calls = { email: 0, push: 0 };
    setStorageNotificationTransportsForTests({
      sendEmail: async () => { calls.email += 1; },
      sendPush: async () => { calls.push += 1; },
    });
    try {
      assert.strictEqual(await sendStorageNotification({
        owner: { _id: 'storage-message-test:owner', name: 'Anna', email: 'anna@example.com' },
        decisionType: 'warning', decisionId: disabledDecisionId,
        context: { owner_name: 'Anna', unit_name: '1001', deadline_at: new Date('2026-10-01T00:00:00Z') },
      }), disabledMessageId);
      assert.deepStrictEqual(calls, { email: 0, push: 1 });
      assert(await Messages.findOneAsync(disabledMessageId));
    } finally {
      await Messages.removeAsync(disabledMessageId);
    }
  });
});
