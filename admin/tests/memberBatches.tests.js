import assert from 'assert';
import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/roles';
import { Members } from '/imports/common/collections/members';
import { Memberships } from '/imports/common/collections/memberships';
import { PushSubs } from '/imports/common/collections/pushSubs';
import { memberStatus, statusFromMemberships, membershipsByMember } from '/imports/common/lib/utils';
import { notifyExpiringMemberships } from '/server/cronjob/notifyExpiring';
import '/server/methods/update';

// The jobs over every member: the dates put right, and the expiry push.
// Both fetch all memberships at once; they must reckon as memberStatus does.

const prefix = 'batchtest-';
const DAY = 86400000;
const noon = () => { const d = new Date(); d.setHours(12, 0, 0, 0); return d; };
const inDays = (n) => new Date(noon().getTime() + n * DAY);

describe('jobs over every member', function () {
  const admin = `${prefix}admin`;
  const cleanup = async () => {
    await Members.removeAsync({ _id: { $regex: `^${prefix}` } });
    await Memberships.removeAsync({ mid: { $regex: `^${prefix}` } });
    await PushSubs.removeAsync({ userId: { $regex: `^${prefix}` } });
    await Meteor.roleAssignment.removeAsync({ 'user._id': { $regex: `^${prefix}` } });
    await Meteor.users.removeAsync({ _id: { $regex: `^${prefix}` } });
  };
  const member = async (key, fields = {}) => {
    const _id = `${prefix}${key}`;
    await Members.insertAsync({ _id, mid: key.slice(0, 10), name: `Batch ${key}`, email: `${_id}@example.org`, ...fields });
    return _id;
  };
  const membership = (mid, fields) => Memberships.insertAsync({ mid, start: inDays(-300), type: 'member', amount: 1, ...fields });

  before(cleanup);
  after(cleanup);
  const whitelist = Meteor.settings.private?.recipientWhitelist;
  before(() => { Meteor.settings.private = { ...Meteor.settings.private, recipientWhitelist: [] }; });
  after(() => { Meteor.settings.private = { ...Meteor.settings.private, recipientWhitelist: whitelist }; });

  it('reckons from memberships fetched at once as memberStatus does', async function () {
    const id = await member('reckon');
    await membership(id, { type: 'labandmember', memberend: inDays(40), labend: inDays(40) });
    await membership(id, { type: 'member', start: inDays(-700), memberend: inDays(-335) });
    const all = await membershipsByMember();
    const one = await memberStatus(await Members.findOneAsync(id));
    assert.deepStrictEqual(statusFromMemberships(all[id]), one);
  });

  it('puts right only the members whose dates are out of step', async function () {
    await Roles.createRoleAsync('admin', { unlessExists: true });
    await Meteor.users.insertAsync({ _id: admin });
    await Roles.addUsersToRolesAsync(admin, 'admin', null);
    const drifted = await member('drifted', { member: inDays(-400), family: false });
    await membership(drifted, { memberend: inDays(50) });
    const call = () => Meteor.server.method_handlers.updateMembers.apply({ userId: admin, isSimulation: false }, []);
    const first = await call();
    assert.ok(first.changed >= 1);
    assert.strictEqual((await Members.findOneAsync(drifted)).member.getTime(), inDays(50).getTime());
    const second = await call();
    assert.strictEqual(second.changed, 0);
    assert.strictEqual(second.total, first.total);
  });

  it('notifies a member, and a family member through the payer, a week before the end', async function () {
    const payer = await member('payer', { family: true });
    await membership(payer, { memberend: inDays(7), family: true });
    const dependent = await member('dependent', { infamily: payer });
    const notThisWeek = await member('later');
    await membership(notThisWeek, { memberend: inDays(30) });
    for (const id of [payer, dependent, notThisWeek]) {
      // Upper case in the account: the lookup ignores case, as findUserByEmail does.
      await Meteor.users.insertAsync({ _id: `${prefix}u-${id}`, emails: [{ address: `${id}@EXAMPLE.org`, verified: true }] });
      await PushSubs.insertAsync({ userId: `${prefix}u-${id}`, endpoint: `https://push.example.org/${id}`, keys: { p256dh: 'x', auth: 'y' } });
    }
    await notifyExpiringMemberships();
    assert.strictEqual((await Members.findOneAsync(payer)).lastExpiryNotification?.type, '7daysBefore');
    const familyNote = (await Members.findOneAsync(dependent)).lastExpiryNotification;
    assert.ok(familyNote, 'the family member is told too');
    assert.strictEqual((await Members.findOneAsync(notThisWeek)).lastExpiryNotification, undefined);
  });
});
