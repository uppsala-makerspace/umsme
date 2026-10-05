import assert from 'assert';
import { Meteor } from 'meteor/meteor';
import { isRecipientAllowed, recipientWhitelist, allowedPushSubscriptions } from '/imports/common/server/recipientGuard';
import { isEmailAllowed } from '/imports/common/server/emailGuard';

// Runs the test body with private.recipientWhitelist / emailWhitelist set as
// given, restoring the real settings afterwards.
const withSettings = async (values, body) => {
  Meteor.settings.private = Meteor.settings.private || {};
  const saved = {
    recipientWhitelist: Meteor.settings.private.recipientWhitelist,
    emailWhitelist: Meteor.settings.private.emailWhitelist,
  };
  delete Meteor.settings.private.recipientWhitelist;
  delete Meteor.settings.private.emailWhitelist;
  Object.assign(Meteor.settings.private, values);
  try {
    await body();
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete Meteor.settings.private[key];
      else Meteor.settings.private[key] = value;
    }
  }
};

describe('recipientGuard', function () {
  it('allows everyone when no whitelist is set', async function () {
    await withSettings({}, async () => {
      assert.strictEqual(recipientWhitelist(), null);
      assert.strictEqual(isRecipientAllowed('anyone@example.com'), true);
    });
  });

  it('allows no one with an empty recipientWhitelist', async function () {
    await withSettings({ recipientWhitelist: [] }, async () => {
      assert.deepStrictEqual(recipientWhitelist(), []);
      assert.strictEqual(isRecipientAllowed('anyone@example.com'), false);
      assert.strictEqual(isEmailAllowed('anyone@example.com'), false);
    });
  });

  it('keeps the old meaning of an empty emailWhitelist: everyone', async function () {
    await withSettings({ emailWhitelist: [] }, async () => {
      assert.strictEqual(isRecipientAllowed('anyone@example.com'), true);
    });
  });

  it('allows only listed addresses, ignoring case and a display name', async function () {
    await withSettings({ recipientWhitelist: ['Me@Example.com'] }, async () => {
      assert.strictEqual(isRecipientAllowed('me@example.com'), true);
      assert.strictEqual(isRecipientAllowed('Matti <ME@example.com>'), true);
      assert.strictEqual(isRecipientAllowed('someone@example.com'), false);
      assert.strictEqual(isRecipientAllowed(''), false);
    });
  });

  it('still honours the older emailWhitelist, and email uses the same rule', async function () {
    await withSettings({ emailWhitelist: ['me@example.com'] }, async () => {
      assert.strictEqual(isEmailAllowed('me@example.com'), true);
      assert.strictEqual(isEmailAllowed('someone@example.com'), false);
    });
    await withSettings({ recipientWhitelist: ['new@example.com'], emailWhitelist: ['old@example.com'] }, async () => {
      assert.strictEqual(isEmailAllowed('new@example.com'), true);
      assert.strictEqual(isEmailAllowed('old@example.com'), false);
    });
  });

  describe('allowedPushSubscriptions', function () {
    const prefix = 'rgtest-';
    beforeEach(async function () {
      await Meteor.users.removeAsync({ _id: { $regex: `^${prefix}` } });
      await Meteor.users.insertAsync({ _id: `${prefix}me`, emails: [{ address: 'other@example.com' }, { address: 'Me@Example.com' }] });
      await Meteor.users.insertAsync({ _id: `${prefix}member`, emails: [{ address: 'member@example.com' }] });
    });
    afterEach(async function () {
      await Meteor.users.removeAsync({ _id: { $regex: `^${prefix}` } });
    });

    const subs = [
      { endpoint: 'https://push/1', userId: `${prefix}me` },
      { endpoint: 'https://push/2', userId: `${prefix}member` },
      { endpoint: 'https://push/3', userId: `${prefix}me` },
      { endpoint: 'https://push/4' },
    ];

    it('keeps every subscription without a whitelist', async function () {
      await withSettings({}, async () => {
        assert.strictEqual((await allowedPushSubscriptions(subs)).length, 4);
      });
    });

    it('keeps none with an empty whitelist', async function () {
      await withSettings({ recipientWhitelist: [] }, async () => {
        assert.strictEqual((await allowedPushSubscriptions(subs)).length, 0);
      });
    });

    it('keeps only subscriptions of users with a listed address', async function () {
      await withSettings({ recipientWhitelist: ['me@example.com'] }, async () => {
        const kept = await allowedPushSubscriptions(subs);
        assert.deepStrictEqual(kept.map((s) => s.endpoint), ['https://push/1', 'https://push/3']);
      });
    });
  });
});
