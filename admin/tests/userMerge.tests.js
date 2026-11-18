import assert from 'assert';
import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/roles';
import { Members } from '/imports/common/collections/members';
import { Memberships } from '/imports/common/collections/memberships';
import { Comments } from '/imports/common/collections/comments';
import { PushSubs } from '/imports/common/collections/pushSubs';
import { AuditLog } from '/imports/common/collections/auditLog';
import { memberForUser } from '/imports/common/server/memberForUser';
import { planUserMerge, mergeUsers, mergedEmails } from '/imports/common/server/users/merge';

const prefix = 'umtest-';
const KEPT = `${prefix}kept`;
const REMOVED = `${prefix}removed`;
const day = 86400000;
const raw = (collection) => collection.rawCollection();

const cleanup = async () => {
  await Meteor.users.removeAsync({ _id: { $regex: `^${prefix}` } });
  for (const c of [Members, Memberships, PushSubs]) await raw(c).deleteMany({ _id: { $regex: `^${prefix}` } });
  await raw(Comments).deleteMany({ about: { $regex: `^${prefix}` } });
  await raw(AuditLog).deleteMany({ docId: { $regex: `^${prefix}` } });
  await Meteor.roleAssignment.removeAsync({ 'user._id': { $regex: `^${prefix}` } });
};

// One person's two accounts: the kept one with a password and its own member,
// the other with Google, a session, a push subscription and the paid member.
const seed = async () => {
  await raw(Meteor.users).insertMany([
    {
      _id: KEPT, emails: [{ address: 'kept@example.com', verified: true }, { address: 'Shared@example.com', verified: false }],
      services: { password: { bcrypt: 'kept-hash' }, resume: { loginTokens: [{ when: new Date(), hashedToken: `${prefix}tok-k` }] } },
    },
    {
      _id: REMOVED, emails: [{ address: 'removed@example.com', verified: true }],
      services: {
        password: { bcrypt: 'removed-hash' },
        google: { id: `${prefix}g1`, email: 'removed@example.com' },
        resume: { loginTokens: [{ when: new Date(), hashedToken: `${prefix}tok-r` }, { when: new Date(), hashedToken: `${prefix}tok-imp`, impersonatedBy: 'someone' }] },
      },
      lastSeenAt: new Date(),
    },
  ]);
  await raw(Members).insertMany([
    { _id: `${prefix}m-kept`, mid: 'um-1', name: 'Kept Person', email: 'kept@example.com' },
    { _id: `${prefix}m-paid`, mid: 'um-2', name: 'Paid Person', email: 'removed@example.com' },
  ]);
  await raw(Memberships).insertOne({
    _id: `${prefix}ms`, mid: `${prefix}m-paid`, type: 'member', start: new Date(Date.now() - 10 * day), memberend: new Date(Date.now() + 300 * day),
  });
  await raw(PushSubs).insertOne({ _id: `${prefix}push`, userId: REMOVED, endpoint: `${prefix}endpoint`, keys: {} });
};

describe('user account merge', function () {
  beforeEach(async function () {
    await cleanup();
    await seed();
  });
  after(cleanup);

  it('joins the emails, verified if verified on either, the kept ones first', function () {
    const emails = mergedEmails(
      { emails: [{ address: 'a@x.se', verified: false }] },
      { emails: [{ address: 'A@x.se', verified: true }, { address: 'b@x.se', verified: false }] },
    );
    assert.deepStrictEqual(emails, [{ address: 'a@x.se', verified: true }, { address: 'b@x.se', verified: false }]);
  });

  it('previews the members and keeps the paid one by default', async function () {
    const plan = await planUserMerge(KEPT, REMOVED);
    assert.deepStrictEqual(plan.blockers, []);
    assert.strictEqual(plan.members.keptMemberId, `${prefix}m-paid`);
    assert.strictEqual(plan.members.plan.source._id, `${prefix}m-kept`);
    assert.ok(plan.moves.some((m) => m.label === 'Push subscriptions'));
    assert.strictEqual(plan.moves.find((m) => m.label === 'Sessions').count, 1, 'not the impersonation token');
    assert.ok(await Meteor.users.findOneAsync(REMOVED), 'a preview changes nothing');
  });

  it('merges the accounts and the members, and the kept account finds the paid member', async function () {
    await Roles.createRoleAsync('board', { unlessExists: true });
    await Roles.addUsersToRolesAsync(REMOVED, 'board', null);
    await mergeUsers(KEPT, REMOVED, { userId: `${prefix}admin` });

    assert.strictEqual(await Meteor.users.findOneAsync(REMOVED), undefined);
    const kept = await Meteor.users.findOneAsync(KEPT);
    assert.deepStrictEqual(kept.emails.map((e) => e.address), ['kept@example.com', 'Shared@example.com', 'removed@example.com']);
    assert.strictEqual(kept.services.password.bcrypt, 'kept-hash', 'the kept password stays');
    assert.strictEqual(kept.services.google.id, `${prefix}g1`);
    assert.deepStrictEqual(kept.services.resume.loginTokens.map((t) => t.hashedToken), [`${prefix}tok-k`, `${prefix}tok-r`]);
    assert.ok(kept.lastSeenAt);
    assert.strictEqual((await PushSubs.findOneAsync(`${prefix}push`)).userId, KEPT);
    assert.ok(await Roles.userIsInRoleAsync(KEPT, 'board'));

    assert.strictEqual(await Members.findOneAsync(`${prefix}m-kept`), undefined);
    assert.strictEqual((await memberForUser(kept))._id, `${prefix}m-paid`);
    assert.ok(await AuditLog.findOneAsync({ domain: 'users', action: 'merge', docId: KEPT }));
    assert.ok(await Comments.findOneAsync({ about: KEPT, text: /removed@example.com/ }));
  });

  it('keeps the member chosen', async function () {
    await mergeUsers(KEPT, REMOVED, { keptMemberId: `${prefix}m-kept` });
    assert.strictEqual(await Members.findOneAsync(`${prefix}m-paid`), undefined);
    assert.strictEqual((await Memberships.findOneAsync(`${prefix}ms`)).mid, `${prefix}m-kept`);
  });

  it('takes the password from the removed account when the kept one has none', async function () {
    await raw(Meteor.users).updateOne({ _id: KEPT }, { $unset: { 'services.password': '' } });
    await mergeUsers(KEPT, REMOVED);
    assert.strictEqual((await Meteor.users.findOneAsync(KEPT)).services.password.bcrypt, 'removed-hash');
  });

  it('refuses two different Google accounts, the admin login and one\'s own account', async function () {
    await raw(Meteor.users).updateOne({ _id: KEPT }, { $set: { 'services.google': { id: `${prefix}g2` } } });
    assert.ok((await planUserMerge(KEPT, REMOVED)).blockers.some((b) => b.includes('google')));
    await assert.rejects(mergeUsers(KEPT, REMOVED), /merge-blocked/);
    assert.ok(await Meteor.users.findOneAsync(REMOVED));
    await raw(Meteor.users).updateOne({ _id: KEPT }, { $unset: { 'services.google': '' }, $set: { username: 'admin' } });
    assert.ok((await planUserMerge(KEPT, REMOVED)).blockers.some((b) => b.includes('admin login')));
    await raw(Meteor.users).updateOne({ _id: KEPT }, { $unset: { username: '' } });
    assert.ok((await planUserMerge(KEPT, REMOVED, { actorId: REMOVED })).blockers.some((b) => b.includes('your own')));
  });

  it('can be run again after stopping half-way', async function () {
    // As if the members had been merged and then it stopped.
    const { mergeMembers } = await import('/imports/common/server/members/merge');
    await mergeMembers(await Members.findOneAsync(`${prefix}m-kept`), await Members.findOneAsync(`${prefix}m-paid`), { accountsMerged: true });
    await mergeUsers(KEPT, REMOVED);
    assert.strictEqual(await Meteor.users.findOneAsync(REMOVED), undefined);
    assert.strictEqual((await memberForUser(await Meteor.users.findOneAsync(KEPT)))._id, `${prefix}m-paid`);
  });
});
