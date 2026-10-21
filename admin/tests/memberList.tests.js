import assert from 'assert';
import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/roles';
import { Members } from '/imports/common/collections/members';
import { reminderStateOf } from '/imports/common/server/members/memberList';
import '/server/methods/memberLookup';

const prefix = 'mlisttest-';
const board = `${prefix}board`;
const DAY = 24 * 60 * 60 * 1000;
const call = (userId, name, ...args) =>
  Meteor.server.method_handlers[name].apply({ userId, isSimulation: false }, args);

describe('member lists', function () {
  before(async function () {
    await Meteor.users.removeAsync(board);
    await Roles.createRoleAsync('board', { unlessExists: true });
    await Meteor.users.insertAsync({ _id: board, emails: [{ address: `${board}@example.org` }] });
    await Roles.addUsersToRolesAsync(board, 'board', null);
    await Members.removeAsync({ _id: { $regex: `^${prefix}` } });
    const now = Date.now();
    await Members.insertAsync({ _id: `${prefix}a`, mid: 'ML1', name: 'Mlist Ending', email: `${prefix}a@example.org`, member: new Date(now + 5 * DAY) });
    await Members.insertAsync({ _id: `${prefix}b`, mid: 'ML2', name: 'Mlist Excluded', email: `${prefix}b@example.org`, member: new Date(now + 300 * DAY), excluded: true });
    await Members.insertAsync({ _id: `${prefix}c`, mid: 'ML3', name: 'Mlist Later', email: `${prefix}c@example.org`, member: new Date(now + 300 * DAY) });
  });

  after(async function () {
    await Members.removeAsync({ _id: { $regex: `^${prefix}` } });
    await Meteor.roleAssignment.removeAsync({ 'user._id': board });
    await Meteor.users.removeAsync(board);
  });

  it('pages a view, searched and sorted', async function () {
    const all = await call(board, 'adminMembers.page', { view: 'all', search: 'mlist', sort: { field: 'mid', direction: 'desc' }, page: 0, pageSize: 2 });
    assert.strictEqual(all.total, 3);
    assert.deepStrictEqual(all.rows.map((m) => m.mid), ['ML3', 'ML2']);
    const excluded = await call(board, 'adminMembers.page', { view: 'excluded', search: 'mlist' });
    assert.deepStrictEqual(excluded.rows.map((m) => m.mid), ['ML2']);
    const reminders = await call(board, 'adminMembers.page', { view: 'reminders', search: 'mlist' });
    assert.deepStrictEqual(reminders.rows.map((m) => [m.mid, m.reminderState]), [['ML1', 'needed']]);
  });

  it('refuses an unknown view or sort, and anyone without the role', async function () {
    await assert.rejects(call(board, 'adminMembers.page', { view: 'secret' }), /bad-view/);
    await assert.rejects(call(board, 'adminMembers.page', { view: 'all', sort: { field: 'bankAccountNumber', direction: 'asc' } }), /bad-sort/);
    await assert.rejects(call(null, 'adminMembers.page', { view: 'all' }), /not-authorized/);
  });

  it('works out the reminder state', function () {
    const now = new Date();
    assert.strictEqual(reminderStateOf({ member: new Date(now.getTime() + 3 * DAY) }, now), 'needed');
    assert.strictEqual(reminderStateOf({ member: new Date(now.getTime() - 3 * DAY) }, now), 'overdue');
    assert.strictEqual(reminderStateOf({ member: new Date(now.getTime() + 3 * DAY), reminder: new Date(now.getTime() - DAY) }, now), 'done');
    assert.strictEqual(reminderStateOf({ infamily: 'x' }, now), null);
  });
});
