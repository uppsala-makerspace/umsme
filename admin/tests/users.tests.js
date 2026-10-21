import assert from 'assert';
import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/roles';
import { Comments } from '/imports/common/collections/comments';
import '/server/methods/user';

const prefix = 'usrtest-';
const admin = `${prefix}admin`;
const board = `${prefix}board`;
const target = `${prefix}target`;
const call = (userId, name, ...args) =>
  Meteor.server.method_handlers[name].apply({ userId, isSimulation: false }, args);

describe('user accounts', function () {
  beforeEach(async function () {
    await Meteor.users.removeAsync({ _id: { $regex: `^${prefix}` } });
    for (const [_id, role] of [[admin, 'admin'], [board, 'board']]) {
      await Roles.createRoleAsync(role, { unlessExists: true });
      await Meteor.users.insertAsync({ _id, username: _id, emails: [{ address: `${_id}@example.org`, verified: true }] });
      await Roles.addUsersToRolesAsync(_id, role, null);
    }
    await Meteor.users.insertAsync({ _id: target, username: target, emails: [{ address: `${target}@example.org`, verified: true }] });
  });

  after(async function () {
    await Meteor.roleAssignment.removeAsync({ 'user._id': { $regex: `^${prefix}` } });
    await Meteor.users.removeAsync({ _id: { $regex: `^${prefix}` } });
  });

  it('lists the accounts with their roles, searched', async function () {
    const { rows } = await call(board, 'users.page', { search: prefix });
    assert.deepStrictEqual(rows.map((r) => r._id).sort(), [admin, board, target].sort());
    assert.deepStrictEqual(rows.find((r) => r._id === board).roles, ['board']);
  });

  it('renames an account, unverifying a changed email', async function () {
    await call(board, 'users.update', target, { username: `${prefix}renamed`, email: `${prefix}new@example.org` });
    const user = await Meteor.users.findOneAsync(target);
    assert.strictEqual(user.username, `${prefix}renamed`);
    assert.deepStrictEqual(user.emails[0], { address: `${prefix}new@example.org`, verified: false });
  });

  it('gives roles as admin only', async function () {
    await assert.rejects(call(board, 'users.setRole', target, 'treasurer', true), /not-authorized/);
    await call(admin, 'users.setRole', target, 'treasurer', true);
    assert.ok(await Roles.userIsInRoleAsync(target, 'treasurer'));
    await assert.rejects(call(admin, 'users.setRole', target, 'superuser', true), /bad-role/);
  });

  it('removes an account and the comments about it, never your own', async function () {
    await Comments.insertAsync({ about: target, text: 'x', created: new Date() });
    await assert.rejects(call(board, 'users.remove', board), /own-account/);
    await call(board, 'users.remove', target);
    assert.strictEqual(await Meteor.users.findOneAsync(target), undefined);
    assert.strictEqual(await Comments.find({ about: target }).countAsync(), 0);
  });
});
