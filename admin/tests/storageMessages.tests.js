import assert from 'assert';
import { Meteor } from 'meteor/meteor';
import { Messages, isStorageGeneratedMessage } from '/imports/common/collections/messages';
import { MessageTemplates } from '/imports/common/collections/templates';
import {
  sendStorageNotification,
  setStorageNotificationTransportsForTests,
  storageMessageRecordId,
} from '/imports/common/server/storageMessages/service';
import {
  renderStorageNotification,
  STORAGE_DECISION_TYPES,
  STORAGE_NOTIFICATION_FROM,
  STORAGE_NOTIFICATION_REPLY_TO,
  STORAGE_TEMPLATE_TYPES,
} from '/imports/common/server/storageMessages/templates';
import {
  ensureStorageMessageTemplates,
  STORAGE_DEFAULT_TEMPLATES,
} from '/imports/common/server/storageMessages/defaults';

const decisionId = 'storage-message-test:assignment';
const messageId = storageMessageRecordId('assignment', decisionId);
const owner = { _id: 'storage-message-test:owner', name: 'Anna', email: 'anna@example.com' };

describe('storage messages', function () {
  let originalDeliverMails;

  before(async function () {
    await ensureStorageMessageTemplates();
  });

  beforeEach(function () {
    originalDeliverMails = Meteor.settings.deliverMails;
    Meteor.settings.deliverMails = true;
  });

  afterEach(async () => {
    Meteor.settings.deliverMails = originalDeliverMails;
    setStorageNotificationTransportsForTests(undefined);
    await Messages.removeAsync(messageId);
    await MessageTemplates.removeAsync({ name: /^storage-message-test:/ });
  });

  it('seeds one default template per storage type and never a second one', async function () {
    assert.deepStrictEqual(await ensureStorageMessageTemplates(), []);
    for (const defaults of STORAGE_DEFAULT_TEMPLATES) {
      const templates = await MessageTemplates.find({ type: defaults.type }).fetchAsync();
      assert.strictEqual(templates.length, 1, defaults.type);
      assert.strictEqual(templates[0].auto, true);
      assert.strictEqual(templates[0].deprecated, false);
    }
    assert.deepStrictEqual(Object.values(STORAGE_TEMPLATE_TYPES).sort(),
      STORAGE_DEFAULT_TEMPLATES.map(({ type }) => type).sort());
  });

  it('renders every automatic message in Swedish and English from its template', async function () {
    for (const type of STORAGE_DECISION_TYPES) {
      const rendered = await renderStorageNotification(type, {
        owner, unit_name: '1001', deadline_at: new Date('2026-10-01T00:00:00Z'),
      });
      assert.strictEqual(rendered.status, 'rendered', type);
      assert.strictEqual(rendered.sender_from, STORAGE_NOTIFICATION_FROM);
      assert.strictEqual(rendered.reply_to, STORAGE_NOTIFICATION_REPLY_TO);
      assert.ok(rendered.template_id);
      assert.match(rendered.subject, / — /);
      assert.match(rendered.email, /\n\n---\n\n/);
      assert.doesNotMatch(rendered.email, /<%/);
      assert.strictEqual(rendered.sms, undefined);
    }
  });

  it('exposes the unit name and the deadline as YYYY-MM-DD, and tolerates their absence', async function () {
    const withDeadline = await renderStorageNotification('warning', {
      owner, unit_name: '1001', deadline_at: new Date('2026-10-01T00:00:00Z'),
    });
    assert.match(withDeadline.email, /innan 2026-10-01/);
    const withoutDeadline = await renderStorageNotification('warning', { owner });
    assert.match(withoutDeadline.email, /inom 28 dagar/);
    const move = await renderStorageNotification('move', { owner, unit_name: '2008' });
    assert.match(move.email, /hyllplats \(2008\)/);
    assert.match(move.email, /inom 14 dagar/);
  });

  it('prefers an edited template of the same type and reports a missing one', async function () {
    const edited = await MessageTemplates.insertAsync({
      name: 'storage-message-test:edited', type: STORAGE_TEMPLATE_TYPES.reminder, membershiptype: 'lab',
      membertype: 'normal', auto: true, deprecated: false,
      subject: 'Hej <%= name %> — reminder', messagetext: 'Töm <%= unitName %> senast <%= deadline %>.',
      created: new Date(), modified: new Date(),
    });
    const rendered = await renderStorageNotification('reminder', {
      owner, unit_name: '17', deadline_at: new Date('2026-10-01T00:00:00Z'),
    });
    assert.strictEqual(rendered.template_id, edited);
    assert.strictEqual(rendered.subject, 'Hej Anna — reminder');
    assert.strictEqual(rendered.email, 'Töm 17 senast 2026-10-01.');

    const unknown = await renderStorageNotification('not-a-decision', { owner });
    assert.strictEqual(unknown.status, 'missing_template');
  });

  it('uses one existing Messages row and sends email and app push once', async function () {
    const calls = { email: 0, push: 0 };
    setStorageNotificationTransportsForTests({
      sendEmail: async () => { calls.email += 1; },
      sendPush: async (id) => { calls.push += 1; assert.strictEqual(id, messageId); },
    });
    const input = {
      owner,
      decisionType: 'assignment', decisionId,
      context: { unit_name: '1001' },
      now: new Date('2026-09-10T12:00:00.000Z'),
    };
    assert.strictEqual(await sendStorageNotification(input), messageId);
    assert.strictEqual(await sendStorageNotification(input), messageId);
    assert.deepStrictEqual(calls, { email: 1, push: 1 });
    const message = await Messages.findOneAsync(messageId);
    assert.strictEqual(message.type, 'storage');
    assert.strictEqual(message.member, owner._id);
    const template = await MessageTemplates.findOneAsync({ type: STORAGE_TEMPLATE_TYPES.assignment });
    assert.strictEqual(message.template, template._id);
    assert.match(message.messagetext, /Hej Anna!/);
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
        owner,
        decisionType: 'warning', decisionId: disabledDecisionId,
        context: { unit_name: '1001', deadline_at: new Date('2026-10-01T00:00:00Z') },
      }), disabledMessageId);
      assert.deepStrictEqual(calls, { email: 0, push: 1 });
      assert(await Messages.findOneAsync(disabledMessageId));
    } finally {
      await Messages.removeAsync(disabledMessageId);
    }
  });
});
