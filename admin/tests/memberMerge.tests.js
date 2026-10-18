import assert from 'assert';
import { Meteor } from 'meteor/meteor';
import { Members } from '/imports/common/collections/members';
import { Memberships } from '/imports/common/collections/memberships';
import { Payments } from '/imports/common/collections/payments';
import { initiatedPayments } from '/imports/common/collections/initiatedPayments';
import { Messages } from '/imports/common/collections/messages';
import { Comments } from '/imports/common/collections/comments';
import { Attestations } from '/imports/common/collections/attestations';
import { Certificates } from '/imports/common/collections/certificates';
import { ExpenseAccounts } from '/imports/common/collections/expenseAccounts';
import { GroupMemberships } from '/imports/common/collections/groupMemberships';
import { DoorUnlocks } from '/imports/common/collections/doorunlocks';
import { StorageUnits } from '/imports/common/collections/storage';
import { planMemberMerge, mergeMembers } from '/server/memberMerge';

const prefix = 'mmtest-';
const SOURCE = `${prefix}source`;
const DEST = `${prefix}dest`;
const DEPENDENT = `${prefix}dependent`;
const OTHER = `${prefix}other`;
const day = 86400000;
const inDays = (n) => new Date(Date.now() + n * day);

// Fixtures go in raw: they only need the fields the merge reads.
const raw = (collection) => collection.rawCollection();
const collections = [
  Members, Memberships, Payments, initiatedPayments, Messages, Comments, Attestations,
  Certificates, ExpenseAccounts, GroupMemberships, DoorUnlocks, StorageUnits,
];

const cleanup = async () => {
  for (const c of collections) await raw(c).deleteMany({ _id: { $regex: `^${prefix}` } });
  await raw(Comments).deleteMany({ about: { $regex: `^${prefix}` } });
  await Meteor.users.removeAsync({ _id: { $regex: `^${prefix}` } });
};

const seed = async () => {
  await raw(Members).insertMany([
    {
      _id: SOURCE, mid: 'mm-1', name: 'Source Person', email: 'Source@Example.com',
      birthyear: 1990, gender: 'female', mobile: '0701111111', registered: true,
      liabilityDate: new Date('2026-06-01'), bankName: 'Bank', bankAccountNumber: '123',
    },
    {
      _id: DEST, mid: 'mm-2', name: 'Dest Person', email: 'dest@example.com',
      mobile: '0732222222', liabilityDate: new Date('2025-06-01'),
    },
    { _id: DEPENDENT, mid: 'mm-3', name: 'Dependent', infamily: SOURCE },
  ]);
  await raw(Memberships).insertMany([
    { _id: `${prefix}ms-dest`, mid: DEST, type: 'labandmember', start: inDays(-100), memberend: inDays(100), labend: inDays(100) },
    { _id: `${prefix}ms-source`, mid: SOURCE, type: 'labandmember', start: inDays(-10), memberend: inDays(300), labend: inDays(300) },
  ]);
  await raw(Payments).insertOne({ _id: `${prefix}pay`, member: SOURCE, membership: `${prefix}ms-source`, amount: 1600 });
  await raw(initiatedPayments).insertOne({ _id: `${prefix}ip`, member: SOURCE, status: 'PAID' });
  await raw(Messages).insertOne({ _id: `${prefix}msg`, member: SOURCE, type: 'welcome' });
  await raw(DoorUnlocks).insertOne({ _id: `${prefix}unlock`, memberid: SOURCE, door: 'outerDoor' });
  await raw(Attestations).insertMany([
    { _id: `${prefix}att-dest`, memberId: DEST, certificateId: 'cert-a', certifierId: OTHER },
    { _id: `${prefix}att-dup`, memberId: SOURCE, certificateId: 'cert-a', certifierId: OTHER },
    { _id: `${prefix}att-moved`, memberId: SOURCE, certificateId: 'cert-b', certifierId: SOURCE },
  ]);
  await raw(Certificates).insertOne({ _id: `${prefix}cert`, certifiers: [SOURCE, DEST, OTHER] });
  await raw(ExpenseAccounts).insertOne({ _id: `${prefix}acct`, approverMemberIds: [SOURCE] });
  await raw(GroupMemberships).insertMany([
    { _id: `${prefix}gm-dest`, groupId: `${prefix}group-shared`, memberId: DEST, state: 'pending' },
    { _id: `${prefix}gm-source`, groupId: `${prefix}group-shared`, memberId: SOURCE, state: 'active' },
    { _id: `${prefix}gm-only`, groupId: `${prefix}group-only`, memberId: SOURCE, state: 'active' },
  ]);
};

const member = (id) => Members.findOneAsync(id);

describe('member merge', function () {
  beforeEach(async function () {
    await cleanup();
    await seed();
  });
  after(cleanup);

  it('previews without changing anything', async function () {
    const plan = await planMemberMerge(await member(SOURCE), await member(DEST));
    assert.deepStrictEqual(plan.blockers, []);
    const count = (label) => plan.moves.find((m) => m.label === label)?.count;
    assert.strictEqual(count('Memberships'), 1);
    assert.strictEqual(count('Payments'), 1);
    assert.strictEqual(count('Attestations'), 1);
    assert.strictEqual(count('Attestations dropped, destination already has them'), 1);
    assert.strictEqual(count('Group memberships merged, both were in the same group'), 1);
    assert.ok(plan.warnings.some((w) => w.includes('overlaps')));
    assert.deepStrictEqual(plan.copies.map((c) => c.field).sort(),
      ['bankAccountNumber', 'bankName', 'birthyear', 'gender', 'liabilityDate', 'registered']);
    assert.ok(await member(SOURCE));
    assert.strictEqual((await member(DEST)).birthyear, undefined);
  });

  it('fills in what the destination lacks and keeps what it has', async function () {
    await mergeMembers(await member(SOURCE), await member(DEST));
    const dest = await member(DEST);
    assert.strictEqual(dest.birthyear, 1990);
    assert.strictEqual(dest.gender, 'female');
    assert.strictEqual(dest.mobile, '0732222222');
    assert.strictEqual(dest.registered, true);
    assert.strictEqual(dest.bankAccountNumber, '123');
    assert.deepStrictEqual(dest.liabilityDate, new Date('2026-06-01'));
  });

  it('keeps the destination\'s liability date when it is later', async function () {
    await raw(Members).updateOne({ _id: DEST }, { $set: { liabilityDate: new Date('2026-09-01') } });
    await mergeMembers(await member(SOURCE), await member(DEST));
    assert.deepStrictEqual((await member(DEST)).liabilityDate, new Date('2026-09-01'));
  });

  it('moves every reference to the destination and removes the source', async function () {
    await mergeMembers(await member(SOURCE), await member(DEST));

    assert.strictEqual(await member(SOURCE), undefined);
    assert.strictEqual((await Memberships.findOneAsync(`${prefix}ms-source`)).mid, DEST);
    assert.strictEqual((await Payments.findOneAsync(`${prefix}pay`)).member, DEST);
    assert.strictEqual((await initiatedPayments.findOneAsync(`${prefix}ip`)).member, DEST);
    assert.strictEqual((await Messages.findOneAsync(`${prefix}msg`)).member, DEST);
    assert.strictEqual((await DoorUnlocks.findOneAsync(`${prefix}unlock`)).memberid, DEST);
    assert.strictEqual((await member(DEPENDENT)).infamily, DEST);

    assert.strictEqual(await Attestations.findOneAsync(`${prefix}att-dup`), undefined);
    const moved = await Attestations.findOneAsync(`${prefix}att-moved`);
    assert.strictEqual(moved.memberId, DEST);
    assert.strictEqual(moved.certifierId, DEST);

    assert.deepStrictEqual((await Certificates.findOneAsync(`${prefix}cert`)).certifiers, [DEST, OTHER]);
    assert.deepStrictEqual((await ExpenseAccounts.findOneAsync(`${prefix}acct`)).approverMemberIds, [DEST]);

    // The active row wins over the destination's pending one.
    const shared = await GroupMemberships.find({ groupId: `${prefix}group-shared` }).fetchAsync();
    assert.strictEqual(shared.length, 1);
    assert.strictEqual(shared[0].memberId, DEST);
    assert.strictEqual(shared[0].state, 'active');
    assert.strictEqual((await GroupMemberships.findOneAsync(`${prefix}gm-only`)).memberId, DEST);

    // Cached dates follow the moved membership, and the merge is noted.
    const dest = await member(DEST);
    assert.ok(dest.lab > inDays(299));
    assert.ok(await Comments.findOneAsync({ about: DEST, text: /Merged member mm-1/ }));
  });

  it('warns about an account that only finds the source by email', async function () {
    await Meteor.users.insertAsync({ _id: `${prefix}user`, emails: [{ address: 'source@example.com', verified: true }] });
    const plan = await planMemberMerge(await member(SOURCE), await member(DEST));
    assert.ok(plan.warnings.some((w) => w.includes('source@example.com')));
  });

  it('can be run again after stopping half-way', async function () {
    // As if the first run had moved the payment and then stopped.
    await raw(Payments).updateOne({ _id: `${prefix}pay` }, { $set: { member: DEST } });
    await mergeMembers(await member(SOURCE), await member(DEST));
    assert.strictEqual(await member(SOURCE), undefined);
    assert.strictEqual((await Memberships.findOneAsync(`${prefix}ms-source`)).mid, DEST);
  });

  describe('blockers', function () {
    const blockersFor = async (sourceId, destId) =>
      (await planMemberMerge(await member(sourceId), await member(destId))).blockers;

    it('refuses to merge a member into itself', async function () {
      assert.strictEqual((await blockersFor(SOURCE, SOURCE)).length > 0, true);
    });

    it('refuses when one is in the other one\'s family', async function () {
      assert.ok((await blockersFor(DEPENDENT, SOURCE)).some((b) => b.includes('family')));
    });

    it('refuses when both occupy a storage unit', async function () {
      await raw(StorageUnits).insertMany([
        { _id: `${prefix}unit-1`, name: `${prefix}unit-1`, wall_id: `${prefix}wall`, column: 1, row: 1, owner: SOURCE, availability_status: 'occupied' },
        { _id: `${prefix}unit-2`, name: `${prefix}unit-2`, wall_id: `${prefix}wall`, column: 2, row: 1, owner: DEST, availability_status: 'occupied' },
      ]);
      assert.ok((await blockersFor(SOURCE, DEST)).some((b) => b.includes('storage unit')));
      await assert.rejects(mergeMembers(await member(SOURCE), await member(DEST)), /merge-blocked/);
      assert.ok(await member(SOURCE));
    });
  });
});
