import assert from 'assert';
import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/roles';
import { Members } from '/imports/common/collections/members';
import { Memberships } from '/imports/common/collections/memberships';
import { Messages } from '/imports/common/collections/messages';
import Invites from '/imports/common/collections/Invites';
import '/server/methods/members';
import '/server/methods/memberLookup';

const prefix = 'memtest-';
const board = `${prefix}board`;
const treasurer = `${prefix}treasurer`;
const DAY = 86400000;
const call = (userId, name, ...args) =>
  Meteor.server.method_handlers[name].apply({ userId, isSimulation: false }, args);

describe('members', function () {
  const created = [];
  const member = async (fields) => {
    const _id = await Members.insertAsync({ mid: `${prefix}${created.length}`, name: `Memtest ${created.length}`, email: `${prefix}${created.length}@example.org`, ...fields });
    created.push(_id);
    return _id;
  };

  before(async function () {
    for (const [_id, role] of [[board, 'board'], [treasurer, 'treasurer']]) {
      await Meteor.users.removeAsync(_id);
      await Roles.createRoleAsync(role, { unlessExists: true });
      await Meteor.users.insertAsync({ _id, emails: [{ address: `${_id}@example.org` }] });
      await Roles.addUsersToRolesAsync(_id, role, null);
    }
  });

  afterEach(async function () {
    const named = (await Members.find({ name: { $regex: '^Memtest' } }).fetchAsync()).map((m) => m._id);
    await Memberships.removeAsync({ mid: { $in: [...created, ...named] } });
    await Messages.removeAsync({ member: { $in: [...created, ...named] } });
    await Invites.removeAsync({ email: { $regex: `^${prefix}` } });
    await Members.removeAsync({ _id: { $in: [...created, ...named] } });
    created.length = 0;
  });

  after(async function () {
    await Meteor.roleAssignment.removeAsync({ 'user._id': { $regex: `^${prefix}` } });
    await Meteor.users.removeAsync({ _id: { $regex: `^${prefix}` } });
  });

  it('adds a member with a member number, and edits them', async function () {
    const docId = await call(board, 'members.create', { name: 'Memtest New', email: ' Memtest-New@Example.org ' }, { infamily: null, paymentId: null });
    const doc = await Members.findOneAsync(docId);
    assert.ok(/^\d+$/.test(doc.mid));
    assert.strictEqual(doc.email, 'memtest-new@example.org');
    await call(board, 'members.update', docId, { name: 'Memtest Renamed', mobile: '070' }, doc.updatedAt);
    assert.strictEqual((await Members.findOneAsync(docId)).name, 'Memtest Renamed');
    await assert.rejects(call(board, 'members.update', docId, { name: 'Again' }, doc.updatedAt), /conflict/);
    await assert.rejects(call(treasurer, 'members.update', docId, { name: 'X' }, null), /not-authorized/);
  });

  it('puts drifted dates right, and says they had drifted', async function () {
    const docId = await member({ member: new Date(Date.now() - 400 * DAY) });
    await Memberships.insertAsync({ mid: docId, amount: 200, start: new Date(), type: 'member', discount: false, family: false, memberend: new Date(Date.now() + 300 * DAY) });
    assert.strictEqual((await call(board, 'members.detail', docId)).status.inconsistent, true);
    await call(board, 'members.refreshDates', docId);
    assert.strictEqual((await call(board, 'members.detail', docId)).status.inconsistent, false);
  });

  it('removes a member with their memberships and messages, but not a family payer', async function () {
    const payer = await member({ family: true });
    await member({ infamily: payer });
    await assert.rejects(call(board, 'members.remove', payer), /has-family/);
    const lone = await member({});
    await Memberships.insertAsync({ mid: lone, amount: 200, start: new Date(), type: 'member', discount: false, family: false });
    await call(board, 'members.remove', lone);
    assert.strictEqual(await Members.findOneAsync(lone), undefined);
    assert.strictEqual(await Memberships.find({ mid: lone }).countAsync(), 0);
  });

  it('adds a member to a family and takes them out', async function () {
    const end = new Date(Date.now() + 200 * DAY);
    const payer = await member({ family: true, member: end });
    const candidate = await member({ family: false });
    const { rows } = await call(board, 'adminMembers.page', { view: 'familyCandidates', patronId: payer, search: prefix });
    assert.deepStrictEqual(rows.map((r) => r._id), [candidate]);
    await call(board, 'members.addToFamily', payer, candidate);
    // The dates follow through familyCascade, which these tests leave out.
    assert.strictEqual((await Members.findOneAsync(candidate)).infamily, payer);
    await assert.rejects(call(board, 'members.addToFamily', payer, payer), /not-candidate/);
    await call(board, 'members.removeFromFamily', candidate);
    assert.strictEqual((await Members.findOneAsync(candidate)).infamily, undefined);
  });
});
