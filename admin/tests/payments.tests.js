import assert from 'assert';
import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/roles';
import { Payments } from '/imports/common/collections/payments';
import { Memberships } from '/imports/common/collections/memberships';
import { Members } from '/imports/common/collections/members';
import '/server/methods/payments';

const prefix = 'paytest-';
const board = `${prefix}board`;
const treasurer = `${prefix}treasurer`;
const memberId = `${prefix}member`;
const call = (userId, name, ...args) =>
  Meteor.server.method_handlers[name].apply({ userId, isSimulation: false }, args);
const newPayment = (fields = {}) => Payments.insertAsync({ hash: `${prefix}${Math.random()}`, type: 'swish', amount: 200, date: new Date(), message: `${prefix}msg`, mobile: '46700000001', ...fields });

describe('payments and memberships', function () {
  before(async function () {
    for (const [_id, role] of [[board, 'board'], [treasurer, 'treasurer']]) {
      await Meteor.users.removeAsync(_id);
      await Roles.createRoleAsync(role, { unlessExists: true });
      await Meteor.users.insertAsync({ _id, emails: [{ address: `${_id}@example.org` }] });
      await Roles.addUsersToRolesAsync(_id, role, null);
    }
  });

  beforeEach(async function () {
    await Members.removeAsync(memberId);
    await Members.insertAsync({ _id: memberId, mid: 'P1', name: 'Paytest Member' });
  });

  afterEach(async function () {
    await Payments.removeAsync({ message: { $regex: `^${prefix}` } });
    await Memberships.removeAsync({ mid: memberId });
    await Members.removeAsync(memberId);
  });

  after(async function () {
    await Meteor.roleAssignment.removeAsync({ 'user._id': { $regex: `^${prefix}` } });
    await Meteor.users.removeAsync({ _id: { $regex: `^${prefix}` } });
  });

  it('files a payment to a member, leaving their mobile alone', async function () {
    const pid = await newPayment();
    await call(board, 'payments.assignMember', pid, memberId);
    assert.strictEqual((await Payments.findOneAsync(pid)).member, memberId);
    assert.strictEqual((await Members.findOneAsync(memberId)).mobile, undefined);
    await assert.rejects(call(treasurer, 'payments.assignMember', pid, memberId), /not-authorized/);
  });

  it('makes a membership from a payment, sets the member’s dates, and keeps the payment', async function () {
    const pid = await newPayment({ member: memberId });
    const suggestion = await call(board, 'memberships.suggest', memberId, pid);
    assert.strictEqual(suggestion.amount, 200);
    const msid = await call(board, 'memberships.create', { memberId, paymentId: pid, start: suggestion.start, amount: 200 });
    assert.strictEqual((await Payments.findOneAsync(pid)).membership, msid);
    assert.ok((await Members.findOneAsync(memberId)).member > new Date());
    await assert.rejects(call(board, 'payments.remove', pid), /has-membership/);
    const { dependents, payment } = await call(board, 'memberships.detail', msid);
    assert.deepStrictEqual([dependents, payment._id], [[], pid]);
  });

  it('edits and removes a membership, the member’s dates following', async function () {
    const msid = await call(board, 'memberships.create', { memberId, paymentId: null, start: new Date(), amount: 200 });
    const { updatedAt, memberend } = await Memberships.findOneAsync(msid);
    const later = new Date(memberend.getTime() + 30 * 86400000);
    await call(board, 'memberships.update', msid, { amount: 250, start: new Date(), type: 'member', discount: false, family: false, memberend: later, labend: null }, updatedAt);
    assert.strictEqual((await Members.findOneAsync(memberId)).member.getTime(), later.getTime());
    await assert.rejects(call(board, 'memberships.update', msid, { amount: 250, start: new Date(), type: 'member', discount: false, family: false, memberend: later, labend: null }, updatedAt), /conflict/);
    await call(board, 'memberships.remove', msid);
    assert.strictEqual((await Members.findOneAsync(memberId)).member, undefined);
  });

  it('marks a payment other and lists it under manual', async function () {
    const pid = await newPayment();
    await call(board, 'payments.setOther', pid, true);
    const { rows } = await call(board, 'payments.page', { tab: 'manual', search: `${prefix}msg` });
    assert.deepStrictEqual(rows.map((r) => [r._id, r.kind]), [[pid, 'other']]);
    await call(board, 'payments.remove', pid);
    assert.strictEqual(await Payments.findOneAsync(pid), undefined);
  });
});
