import assert from 'assert';
import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/roles';
import { Members } from '/imports/common/collections/members';
import { Memberships } from '/imports/common/collections/memberships';
import { Payments } from '/imports/common/collections/payments';
import '/imports/common/collections/users';
import { checkAdminLoginAttempt } from '/server/accounts';

const prefix = 'cwrtest-';
const memberId = `${prefix}member`;

// Calls a collection mutation method the way a DDP client does: through the
// method handler, with the connection's userId and not as a simulation.
// Async so a handler that throws synchronously still yields a rejection.
const clientCall = async (userId, collection, method, ...args) =>
  Meteor.server.method_handlers[`/${collection._name}/${method}`]
    .apply({ userId, isSimulation: false }, args);

const assertDenied = (promise) =>
  assert.rejects(promise, (err) => err.error === 403);

const membershipDoc = () => ({
  mid: memberId,
  start: new Date(),
  type: 'labandmember',
  labend: new Date(Date.now() + 10 * 365 * 86400000),
});

describe('client write rules', function () {
  const plain = `${prefix}plain`;
  const board = `${prefix}board`;
  const admin = `${prefix}admin`;

  const cleanup = async () => {
    await Meteor.roleAssignment.removeAsync({ 'user._id': { $regex: `^${prefix}` } });
    await Meteor.users.removeAsync({ _id: { $regex: `^${prefix}` } });
    await Memberships.removeAsync({ mid: memberId });
    await Members.removeAsync({ _id: { $regex: `^${prefix}` } });
    await Payments.removeAsync({ _id: { $regex: `^${prefix}` } });
  };

  before(async function () {
    await cleanup();
    for (const role of ['admin', 'board']) await Roles.createRoleAsync(role, { unlessExists: true });
    for (const _id of [plain, board, admin]) await Meteor.users.insertAsync({ _id });
    await Roles.addUsersToRolesAsync(board, 'board', null);
    await Roles.addUsersToRolesAsync(admin, 'admin', null);
    await Members.insertAsync({ _id: memberId, name: 'Write Rules', mid: '999999' });
  });
  after(cleanup);

  describe('a logged-in member without a staff role', function () {
    it('cannot insert a membership', async function () {
      await assertDenied(clientCall(plain, Memberships, 'insertAsync', membershipDoc()));
      assert.strictEqual(await Memberships.find({ mid: memberId }).countAsync(), 0);
    });

    it('cannot update a member', async function () {
      await assertDenied(clientCall(plain, Members, 'updateAsync', { _id: memberId }, { $set: { name: 'Changed' } }));
      assert.strictEqual((await Members.findOneAsync(memberId)).name, 'Write Rules');
    });

    it('cannot insert a payment', async function () {
      await assertDenied(clientCall(plain, Payments, 'insertAsync', {
        _id: `${prefix}payment`, hash: `${prefix}hash`, type: 'swish', amount: 1, date: new Date(),
      }));
    });

    it('cannot remove a user account', async function () {
      await assertDenied(clientCall(plain, Meteor.users, 'removeAsync', { _id: board }));
    });
  });

  describe('staff', function () {
    it('board can insert a membership', async function () {
      const id = await clientCall(board, Memberships, 'insertAsync', membershipDoc());
      assert.ok(await Memberships.findOneAsync(id));
    });
  });

  describe('roles', function () {
    it('nobody can assign roles from the client, not even admin', async function () {
      for (const userId of [plain, admin]) {
        await assertDenied(clientCall(userId, Meteor.roleAssignment, 'insertAsync', {
          user: { _id: userId }, role: { _id: 'admin' }, scope: null, inheritedRoles: [{ _id: 'admin' }],
        }));
      }
      assert.strictEqual(await Roles.userIsInRoleAsync(plain, 'admin'), false);
    });
  });

  describe('admin login', function () {
    const attempt = (userId) => ({ allowed: true, user: { _id: userId } });

    it('refuses an account without an admin-system role', async function () {
      await assert.rejects(checkAdminLoginAttempt(attempt(plain)), (err) => err.error === 403);
    });

    it('lets staff in', async function () {
      assert.strictEqual(await checkAdminLoginAttempt(attempt(board)), true);
    });

    it('leaves an already failed attempt failed', async function () {
      assert.strictEqual(await checkAdminLoginAttempt({ allowed: false }), false);
    });
  });
});
