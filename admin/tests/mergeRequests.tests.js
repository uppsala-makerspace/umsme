import assert from 'assert';
import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/roles';
import { Members } from '/imports/common/collections/members';
import { Memberships } from '/imports/common/collections/memberships';
import { Comments } from '/imports/common/collections/comments';
import { AuditLog } from '/imports/common/collections/auditLog';
import { AccountMergeRequests } from '/imports/common/collections/accountMergeRequests';
import { memberForUser } from '/imports/common/server/memberForUser';
import {
  createMergeRequest, mergeRequestInfo, confirmMergeRequest, MAX_MERGE_REQUESTS_PER_HOUR,
} from '/imports/common/server/users/mergeRequests';

const prefix = 'mrtest-';
const ASKER = `${prefix}asker`;
const OTHER = `${prefix}other`;
const hour = 60 * 60 * 1000;
const raw = (collection) => collection.rawCollection();

const cleanup = async () => {
  await Meteor.users.removeAsync({ _id: { $regex: `^${prefix}` } });
  for (const c of [Members, Memberships]) await raw(c).deleteMany({ _id: { $regex: `^${prefix}` } });
  await raw(Comments).deleteMany({ about: { $regex: `^${prefix}` } });
  await raw(AuditLog).deleteMany({ docId: { $regex: `^${prefix}` } });
  await raw(AccountMergeRequests).deleteMany({ fromUserId: { $regex: `^${prefix}` } });
  await Meteor.roleAssignment.removeAsync({ 'user._id': { $regex: `^${prefix}` } });
};

// A new account asks to merge the old one, whose member has paid.
const seed = async () => {
  await raw(Meteor.users).insertMany([
    { _id: ASKER, emails: [{ address: 'mr-new@example.com', verified: true }], services: { password: { bcrypt: 'x' } } },
    { _id: OTHER, emails: [{ address: 'mr-old@example.com', verified: true }], services: { password: { bcrypt: 'y' } } },
  ]);
  await raw(Members).insertMany([
    { _id: `${prefix}m-new`, mid: 'mr-1', name: 'New Account', email: 'mr-new@example.com' },
    { _id: `${prefix}m-old`, mid: 'mr-2', name: 'Paid Account', email: 'mr-old@example.com' },
  ]);
  await raw(Memberships).insertOne({
    _id: `${prefix}ms`, mid: `${prefix}m-old`, type: 'member', start: new Date(Date.now() - 10 * 24 * hour), memberend: new Date(Date.now() + 300 * 24 * hour),
  });
};

const asker = () => Meteor.users.findOneAsync(ASKER);

describe('account merge requests', function () {
  beforeEach(async function () {
    await cleanup();
    await seed();
  });
  after(cleanup);

  it('stores the token hashed, and the link merges the accounts and keeps the paid member', async function () {
    const { token } = await createMergeRequest(await asker(), 'MR-old@example.com');
    const stored = await AccountMergeRequests.findOneAsync({ fromUserId: ASKER });
    assert.notStrictEqual(stored.tokenHash, token);
    assert.strictEqual(stored.toUserId, OTHER);

    const info = await mergeRequestInfo(token);
    assert.deepStrictEqual(info, {
      state: 'ready', reasons: [], kept: 'mr-new@example.com', removed: 'mr-old@example.com', member: { name: 'Paid Account', mid: 'mr-2' },
    });
    const result = await confirmMergeRequest(token);
    assert.strictEqual(result.merged, true);
    assert.strictEqual(await Meteor.users.findOneAsync(OTHER), undefined);
    const kept = await asker();
    assert.deepStrictEqual(kept.emails.map((e) => e.address), ['mr-new@example.com', 'mr-old@example.com']);
    assert.strictEqual((await memberForUser(kept))._id, `${prefix}m-old`);
    assert.strictEqual(await Members.findOneAsync(`${prefix}m-new`), undefined);
  });

  it('works once', async function () {
    const { token } = await createMergeRequest(await asker(), 'mr-old@example.com');
    await confirmMergeRequest(token);
    assert.strictEqual((await mergeRequestInfo(token)).state, 'used');
    await assert.rejects(confirmMergeRequest(token), /bad-token/);
  });

  it('refuses an unknown or expired token, and leaves the accounts as they are', async function () {
    assert.strictEqual((await mergeRequestInfo('no-such-token')).state, 'invalid');
    await assert.rejects(confirmMergeRequest('no-such-token'), /bad-token/);
    const { token } = await createMergeRequest(await asker(), 'mr-old@example.com');
    const later = { now: new Date(Date.now() + 25 * hour) };
    assert.strictEqual((await mergeRequestInfo(token, later)).state, 'expired');
    await assert.rejects(confirmMergeRequest(token, later), /bad-token/);
    assert.ok(await Meteor.users.findOneAsync(OTHER));
  });

  it('is no longer valid once the address has left the other account', async function () {
    const { token } = await createMergeRequest(await asker(), 'mr-old@example.com');
    await raw(Meteor.users).updateOne({ _id: OTHER }, { $set: { emails: [{ address: 'mr-elsewhere@example.com', verified: true }] } });
    assert.strictEqual((await mergeRequestInfo(token)).state, 'invalid');
  });

  it('leaves an account with a staff role to us, noting why', async function () {
    await Roles.createRoleAsync('board', { unlessExists: true });
    await Roles.addUsersToRolesAsync(OTHER, 'board', null);
    const { token } = await createMergeRequest(await asker(), 'mr-old@example.com');
    const info = await mergeRequestInfo(token);
    assert.strictEqual(info.state, 'needsHelp');
    assert.deepStrictEqual(info.reasons, [{ code: 'staffRole' }]);
    const result = await confirmMergeRequest(token);
    assert.strictEqual(result.merged, false);
    assert.deepStrictEqual(result.reasons, [{ code: 'staffRole' }]);
    assert.ok(await Meteor.users.findOneAsync(OTHER));
    assert.ok(await AuditLog.findOneAsync({ action: 'mergeRequestBlocked', docId: ASKER }));
  });

  it('leaves a member in a family to us', async function () {
    await raw(Members).updateOne({ _id: `${prefix}m-new` }, { $set: { infamily: 'someone' } });
    const { token } = await createMergeRequest(await asker(), 'mr-old@example.com');
    const info = await mergeRequestInfo(token);
    assert.strictEqual(info.state, 'needsHelp');
    assert.strictEqual(info.reasons[0].code, 'members');
    assert.ok(info.reasons[0].details.some((d) => d.includes('family')));
  });

  it('leaves two different Google accounts to us', async function () {
    await raw(Meteor.users).updateOne({ _id: ASKER }, { $set: { 'services.google': { id: 'g-a' } } });
    await raw(Meteor.users).updateOne({ _id: OTHER }, { $set: { 'services.google': { id: 'g-b' } } });
    const { token } = await createMergeRequest(await asker(), 'mr-old@example.com');
    assert.deepStrictEqual((await mergeRequestInfo(token)).reasons, [{ code: 'oauthConflict' }]);
  });

  it('refuses one\'s own address, an unknown one, and too many requests', async function () {
    await assert.rejects(createMergeRequest(await asker(), 'mr-new@example.com'), /not-found/);
    await assert.rejects(createMergeRequest(await asker(), 'nobody@example.com'), /not-found/);
    for (let i = 0; i < MAX_MERGE_REQUESTS_PER_HOUR; i += 1) await createMergeRequest(await asker(), 'mr-old@example.com');
    await assert.rejects(createMergeRequest(await asker(), 'mr-old@example.com'), /too-many/);
  });
});
