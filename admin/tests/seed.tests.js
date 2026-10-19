import assert from 'assert';
import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/roles';
import { Members } from '/imports/common/collections/members';
import { Memberships } from '/imports/common/collections/memberships';
import { Payments } from '/imports/common/collections/payments';
import Invites from '/imports/common/collections/Invites';
import {
  assertSeedTarget, databaseName, createRandom, createPeople, storageLocation,
  daysFromNow, makeUser, makeMember, pay, payHistory, joinFamily, inviteToFamily, PRICES,
} from '/imports/common/server/seed';

const DOMAIN = 'seedtest.example.org';
const DAY = 86400000;

describe('seed building blocks', function () {
  describe('random', function () {
    it('gives the same sequence for the same seed', function () {
      const a = createRandom(42);
      const b = createRandom(42);
      const seqA = Array.from({ length: 5 }, () => a.next());
      const seqB = Array.from({ length: 5 }, () => b.next());
      assert.deepStrictEqual(seqA, seqB);
    });

    it('gives a different sequence for another seed', function () {
      assert.notStrictEqual(createRandom(1).next(), createRandom(2).next());
    });

    it('keeps int within its bounds, both included', function () {
      const random = createRandom(7);
      const seen = new Set(Array.from({ length: 200 }, () => random.int(1, 3)));
      assert.deepStrictEqual([...seen].sort(), [1, 2, 3]);
    });

    it('shuffles into a permutation without touching the input', function () {
      const input = [1, 2, 3, 4, 5];
      const shuffled = createRandom(3).shuffle(input);
      assert.deepStrictEqual(input, [1, 2, 3, 4, 5]);
      assert.deepStrictEqual([...shuffled].sort(), input);
    });
  });

  describe('people', function () {
    it('never repeats an email, and keeps to the domain', function () {
      const people = createPeople(createRandom(1), { domain: DOMAIN });
      const emails = Array.from({ length: 300 }, () => people.person().email);
      assert.strictEqual(new Set(emails).size, emails.length);
      assert.ok(emails.every((email) => email.endsWith(`@${DOMAIN}`)));
    });

    it('leaves out reserved addresses', function () {
      const people = createPeople(createRandom(1), { domain: DOMAIN });
      const first = createPeople(createRandom(1), { domain: DOMAIN }).person().email;
      people.reserve(first);
      assert.notStrictEqual(people.person().email, first);
    });

    it('gives ASCII-only email addresses for names with å, ä and ö', function () {
      const people = createPeople(createRandom(5), { domain: DOMAIN });
      const emails = Array.from({ length: 300 }, () => people.person().email);
      assert.ok(emails.every((email) => /^[a-z.0-9]+@/.test(email)), emails.find((e) => !/^[a-z.0-9]+@/.test(e)));
    });

    it('gives Swedish mobile numbers and adult birth years', function () {
      const now = new Date('2026-10-19');
      const people = createPeople(createRandom(9), { domain: DOMAIN, now });
      for (let i = 0; i < 50; i += 1) {
        const { mobile, birthyear } = people.person();
        assert.match(mobile, /^07\d{8}$/);
        assert.ok(birthyear <= 2008 && birthyear >= 1951, String(birthyear));
      }
    });
  });

  describe('guard', function () {
    const empty = { private: { recipientWhitelist: [] } };

    it('reads the database name from a connection string', function () {
      assert.strictEqual(databaseName('mongodb://localhost:27017/umsme-e2e?replicaSet=rs0'), 'umsme-e2e');
      assert.strictEqual(databaseName('mongodb+srv://u:p@cluster.example.org/umsme-demo'), 'umsme-demo');
      assert.strictEqual(databaseName('mongodb://localhost:27017'), null);
      assert.strictEqual(databaseName(undefined), null);
    });

    it('accepts a database named for the scenario with an empty whitelist', function () {
      assert.strictEqual(
        assertSeedTarget({ scenario: 'e2e', mongoUrl: 'mongodb://localhost/umsme-e2e', settings: empty }),
        'umsme-e2e',
      );
      assert.strictEqual(
        assertSeedTarget({ scenario: 'demo', mongoUrl: 'mongodb://localhost/umsme-demo', settings: empty }),
        'umsme-demo',
      );
    });

    it('refuses the production database and its local copies', function () {
      for (const name of ['umsme', 'meteor', 'umsme-e2e-copy']) {
        assert.throws(
          () => assertSeedTarget({ scenario: 'e2e', mongoUrl: `mongodb://localhost/${name}`, settings: empty }),
          /must end in "-e2e"/,
        );
      }
    });

    it('refuses a database named for the other scenario', function () {
      assert.throws(
        () => assertSeedTarget({ scenario: 'e2e', mongoUrl: 'mongodb://localhost/umsme-demo', settings: empty }),
        /must end in "-e2e"/,
      );
    });

    it('refuses without a database name', function () {
      assert.throws(
        () => assertSeedTarget({ scenario: 'e2e', mongoUrl: undefined, settings: empty }),
        /names no database/,
      );
    });

    it('refuses unless the recipient whitelist is an empty list', function () {
      const target = { scenario: 'demo', mongoUrl: 'mongodb://localhost/umsme-demo' };
      for (const settings of [{}, { private: {} }, { private: { recipientWhitelist: ['me@example.org'] } }]) {
        assert.throws(() => assertSeedTarget({ ...target, settings }), /recipientWhitelist/);
      }
    });

    it('refuses an unknown scenario', function () {
      assert.throws(
        () => assertSeedTarget({ scenario: 'prod', mongoUrl: 'mongodb://localhost/umsme-prod', settings: empty }),
        /Unknown seed scenario/,
      );
    });
  });

  describe('storage positions', function () {
    const walls = [
      { _id: 'w1', floor: 'floor1', column_count: 8, row_count: 6, start: 1, end: 48 },
      { _id: 'w2', floor: 'floor2', column_count: 4, row_count: 5, start: 49, end: 68 },
    ];

    it('runs two columns at a time, top to bottom', function () {
      assert.deepStrictEqual(storageLocation(walls, 1), { wall_id: 'w1', floor: 'floor1', column: 1, row: 1, height: 'high' });
      assert.deepStrictEqual(storageLocation(walls, 2), { wall_id: 'w1', floor: 'floor1', column: 2, row: 1, height: 'high' });
      assert.deepStrictEqual(storageLocation(walls, 3), { wall_id: 'w1', floor: 'floor1', column: 1, row: 2, height: 'high' });
      assert.deepStrictEqual(storageLocation(walls, 12), { wall_id: 'w1', floor: 'floor1', column: 2, row: 6, height: 'low' });
      assert.deepStrictEqual(storageLocation(walls, 13), { wall_id: 'w1', floor: 'floor1', column: 3, row: 1, height: 'high' });
    });

    it('starts the next wall where the previous ended, middle row low on odd walls', function () {
      assert.deepStrictEqual(storageLocation(walls, 49), { wall_id: 'w2', floor: 'floor2', column: 1, row: 1, height: 'high' });
      assert.strictEqual(storageLocation(walls, 53).row, 3);
      assert.strictEqual(storageLocation(walls, 53).height, 'low');
    });

    it('refuses a position on no wall', function () {
      assert.throws(() => storageLocation(walls, 69), /on no wall/);
    });
  });

  describe('members and payments', function () {
    let people;
    const memberIds = [];

    const member = async (fields = {}) => {
      const doc = await makeMember({ mid: `S${memberIds.length}`, ...people.person(), ...fields });
      memberIds.push(doc._id);
      return doc;
    };
    const fresh = (doc) => Members.findOneAsync(doc._id);

    beforeEach(function () {
      people = createPeople(createRandom(11), { domain: DOMAIN });
    });

    afterEach(async function () {
      await Payments.removeAsync({ member: { $in: memberIds } });
      await Memberships.removeAsync({ mid: { $in: memberIds } });
      await Members.removeAsync({ _id: { $in: memberIds } });
      await Invites.removeAsync({ email: { $regex: `@${DOMAIN.replace(/\./g, '\\.')}$` } });
      memberIds.length = 0;
    });

    it('creates a registered member without membership dates', async function () {
      const doc = await member();
      assert.strictEqual(doc.registered, true);
      assert.strictEqual(doc.member, undefined);
      assert.strictEqual(doc.lab, undefined);
    });

    it('can leave a member unregistered', async function () {
      const doc = await member({ registered: false });
      assert.strictEqual(doc.registered, undefined);
    });

    it('records a payment, its membership and the member dates', async function () {
      const doc = await member();
      const at = daysFromNow(-10);
      const { paymentId, membershipId } = await pay(doc, 'memberBase', { at });

      const payment = await Payments.findOneAsync(paymentId);
      assert.strictEqual(payment.amount, PRICES.memberBase);
      assert.strictEqual(payment.member, doc._id);
      assert.strictEqual(payment.membership, membershipId);

      const membership = await Memberships.findOneAsync(membershipId);
      assert.strictEqual(membership.mid, doc._id);
      assert.strictEqual(membership.pid, paymentId);
      assert.strictEqual(membership.type, 'member');

      const updated = await fresh(doc);
      const days = (updated.member - at) / DAY;
      assert.ok(days >= 365 && days < 400, `memberend ${days} days after payment`);
      assert.strictEqual(updated.lab, undefined);
    });

    it('gives a lab membership a lab date', async function () {
      const doc = await member();
      await pay(doc, 'memberLab', { at: daysFromNow(-5) });
      const updated = await fresh(doc);
      assert.ok(updated.lab > new Date());
      assert.ok(updated.member > new Date());
    });

    it('builds a renewal history that ends active', async function () {
      const doc = await member();
      await payHistory(doc, [
        { type: 'memberBase', at: daysFromNow(-1 * 365 - 20) },
        { type: 'memberBase', at: daysFromNow(-3 * 365) },
        { type: 'memberBase', at: daysFromNow(-2 * 365 - 10) },
      ]);
      assert.strictEqual(await Payments.find({ member: doc._id }).countAsync(), 3);
      assert.ok((await fresh(doc)).member > new Date());
    });

    it('leaves a member who stopped paying expired', async function () {
      const doc = await member();
      await pay(doc, 'memberBase', { at: daysFromNow(-2 * 365) });
      assert.ok((await fresh(doc)).member < new Date());
    });

    it('refuses a payment the rules refuse', async function () {
      const doc = await member();
      await assert.rejects(() => pay(doc, 'memberQuarterlyLab'), /QUARTERLY_WITHOUT_BASE_MEMBERSHIP/);
    });

    it('gives a family member the payer\'s dates, and keeps them in step', async function () {
      const payer = await member();
      await pay(payer, 'familyBase', { at: daysFromNow(-400) });
      const dependent = await joinFamily(await member(), payer);
      assert.strictEqual(dependent.infamily, payer._id);
      assert.deepStrictEqual(dependent.member, (await fresh(payer)).member);
      assert.strictEqual(dependent.family, true);

      await pay(payer, 'familyLab', { at: daysFromNow(-1) });
      const renewed = await fresh(payer);
      const after = await fresh(dependent);
      assert.deepStrictEqual(after.member, renewed.member);
      assert.deepStrictEqual(after.lab, renewed.lab);
    });

    it('invites by lowercased email', async function () {
      const payer = await member();
      await inviteToFamily(`Someone@${DOMAIN}`, payer);
      const invite = await Invites.findOneAsync({ infamily: payer._id });
      assert.strictEqual(invite.email, `someone@${DOMAIN}`);
    });
  });

  describe('users', function () {
    afterEach(async function () {
      const users = await Meteor.users.find({ 'emails.address': { $regex: `@${DOMAIN.replace(/\./g, '\\.')}$` } }).fetchAsync();
      for (const { _id } of users) await Meteor.roleAssignment.removeAsync({ 'user._id': _id });
      await Meteor.users.removeAsync({ _id: { $in: users.map(({ _id }) => _id) } });
    });

    it('creates a verified user with roles, creating missing roles', async function () {
      const userId = await makeUser({ email: `board@${DOMAIN}`, password: 'password123', roles: ['board', 'seedtestrole'] });
      const user = await Meteor.users.findOneAsync(userId);
      assert.strictEqual(user.emails[0].verified, true);
      assert.ok(await Roles.userIsInRoleAsync(userId, 'board'));
      assert.ok(await Roles.userIsInRoleAsync(userId, 'seedtestrole'));
      await Meteor.roles.removeAsync({ _id: 'seedtestrole' });
    });

    it('can leave the email unverified', async function () {
      const userId = await makeUser({ email: `new@${DOMAIN}`, password: 'password123', verified: false });
      assert.strictEqual((await Meteor.users.findOneAsync(userId)).emails[0].verified, false);
    });
  });
});
