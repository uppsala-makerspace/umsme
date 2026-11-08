import assert from 'assert';
import { Meteor } from 'meteor/meteor';
import { DoorUnlocks } from '/imports/common/collections/doorunlocks';
import { Members } from '/imports/common/collections/members';
import { memberDoorActivity, lastMonths } from '/imports/common/server/doors/doorUnlocks';
import { touchLastSeen, memberAppActivity, LAST_SEEN_RESOLUTION_MS } from '/imports/common/server/users/lastSeen';
import { memberActivity } from '/imports/common/server/members/activity';

const prefix = 'activitytest-';
const MIN = 60 * 1000;

// 1 March 2026, 01:30 in Stockholm (CET, UTC+1): the current month is March.
const now = new Date('2026-03-01T00:30:00Z');

describe('member activity', function () {
  describe('door openings', function () {
    const busy = `${prefix}busy`;
    const idle = `${prefix}idle`;
    const old = `${prefix}old`;
    const unlock = (memberid, iso, door = 'outerDoor', method = 'app') =>
      DoorUnlocks.insertAsync({ timestamp: new Date(iso), door: `${prefix}${door}`, memberid, method });

    before(async function () {
      // 23:30 Stockholm time on 31 January: January, though UTC already says 22:30.
      await unlock(busy, '2026-01-31T22:30:00Z');
      // 00:30 Stockholm time on 1 February: February, though UTC still says January.
      await unlock(busy, '2026-01-31T23:30:00Z', 'upperFloor');
      await unlock(busy, '2026-02-15T12:00:00Z');
      await unlock(busy, '2025-04-02T12:00:00Z', 'outerDoor', 'danalock'); // the oldest month counted
      await unlock(busy, '2025-03-20T12:00:00Z'); // older than twelve months
      // Only openings older than a year.
      await unlock(old, '2024-06-01T10:00:00Z', 'outerDoor', 'danalock');
      // An opening the lock could not tie to a member.
      await DoorUnlocks.insertAsync({ timestamp: new Date('2026-02-10T12:00:00Z'), door: `${prefix}outerDoor`, extid: `${prefix}guest`, method: 'danalock' });
    });

    after(async function () {
      await DoorUnlocks.removeAsync({ door: { $regex: `^${prefix}` } });
    });

    it('names the last twelve months, oldest first, in Swedish time', function () {
      const months = lastMonths(now);
      assert.strictEqual(months.length, 12);
      assert.strictEqual(months[0], '2025-04');
      assert.strictEqual(months[11], '2026-03');
      assert.deepStrictEqual(lastMonths(new Date('2026-12-31T23:30:00Z')).slice(-2), ['2026-12', '2027-01']);
    });

    it('counts per month in Swedish time, with empty months as 0', async function () {
      const { months, total } = await memberDoorActivity(busy, { now });
      const byMonth = Object.fromEntries(months.map((m) => [m.month, m.openings]));
      assert.strictEqual(months.length, 12);
      assert.strictEqual(byMonth['2026-01'], 1);
      assert.strictEqual(byMonth['2026-02'], 2);
      assert.strictEqual(byMonth['2025-04'], 1);
      assert.strictEqual(byMonth['2026-03'], 0);
      assert.strictEqual(total.openings, 4, 'the opening older than twelve months does not count');
    });

    it('counts per door, most first', async function () {
      const { byDoor } = await memberDoorActivity(busy, { now });
      assert.deepStrictEqual(byDoor, [
        { door: `${prefix}outerDoor`, count: 3 },
        { door: `${prefix}upperFloor`, count: 1 },
      ]);
    });

    it('gives the latest opening, however old', async function () {
      const recent = await memberDoorActivity(busy, { now });
      assert.strictEqual(recent.lastUnlock.timestamp.toISOString(), '2026-02-15T12:00:00.000Z');
      const { lastUnlock, total } = await memberDoorActivity(old, { now });
      assert.strictEqual(total.openings, 0);
      assert.strictEqual(lastUnlock.method, 'danalock');
      assert.strictEqual(lastUnlock.timestamp.toISOString(), '2024-06-01T10:00:00.000Z');
    });

    it('counts a visit per day, in Swedish time, however many openings', async function () {
      const twice = `${prefix}twice`;
      // 10 February: three openings at two doors, in the morning and the evening.
      await unlock(twice, '2026-02-10T07:00:00Z');
      await unlock(twice, '2026-02-10T07:05:00Z', 'upperFloor');
      await unlock(twice, '2026-02-10T20:00:00Z');
      // 23:30 Swedish time on 10 February is still the 10th; 00:30 on the 11th is not.
      await unlock(twice, '2026-02-10T22:30:00Z');
      await unlock(twice, '2026-02-10T23:30:00Z');
      const { total, months } = await memberDoorActivity(twice, { now });
      assert.deepStrictEqual(total, { openings: 5, visits: 2 });
      assert.deepStrictEqual(months.find((m) => m.month === '2026-02'), { month: '2026-02', openings: 5, visits: 2 });
    });

    it('gives the days with an opening, for a month by day', async function () {
      const { days } = await memberDoorActivity(`${prefix}twice`, { now });
      assert.deepStrictEqual(days, [
        { day: '2026-02-10', openings: 4, visits: 1 },
        { day: '2026-02-11', openings: 1, visits: 1 },
      ]);
      const busyDays = (await memberDoorActivity(busy, { now })).days.map((d) => d.day);
      assert.deepStrictEqual(busyDays, ['2025-04-02', '2026-01-31', '2026-02-01', '2026-02-15'],
        'oldest first, in Swedish time, none older than the twelve months');
    });

    it('has nothing for a member who never opened a door', async function () {
      const { lastUnlock, total, months, byDoor } = await memberDoorActivity(idle, { now });
      assert.strictEqual(lastUnlock, null);
      assert.deepStrictEqual(total, { openings: 0, visits: 0 });
      assert.ok(months.every((m) => m.openings === 0 && m.visits === 0));
      assert.deepStrictEqual(byDoor, []);
    });
  });

  describe('last in the app', function () {
    const userId = `${prefix}user`;

    beforeEach(async function () {
      await Meteor.users.removeAsync({ _id: userId });
      await Meteor.users.insertAsync({
        _id: userId,
        emails: [{ address: `${prefix}app@example.org`, verified: true }],
        services: { resume: { loginTokens: [
          { hashedToken: `${prefix}own`, when: now },
          { hashedToken: `${prefix}switch`, when: now, impersonatedBy: `${prefix}admin` },
        ] } },
      });
    });

    after(async function () {
      await Meteor.users.removeAsync({ _id: { $regex: `^${prefix}` } });
      await Members.removeAsync({ _id: { $regex: `^${prefix}` } });
    });

    const lastSeen = async () => (await Meteor.users.findOneAsync(userId)).lastSeenAt;

    it('records a visit, then not again within the resolution', async function () {
      assert.strictEqual(await touchLastSeen(userId, { now }), 1);
      assert.strictEqual((await lastSeen()).getTime(), now.getTime());

      const soon = new Date(now.getTime() + 5 * MIN);
      assert.strictEqual(await touchLastSeen(userId, { now: soon }), 0);
      assert.strictEqual((await lastSeen()).getTime(), now.getTime());

      const later = new Date(now.getTime() + LAST_SEEN_RESOLUTION_MS + MIN);
      assert.strictEqual(await touchLastSeen(userId, { now: later }), 1);
      assert.strictEqual((await lastSeen()).getTime(), later.getTime());
    });

    it('does not record an admin viewing the app as the user', async function () {
      assert.strictEqual(await touchLastSeen(userId, { hashedToken: `${prefix}switch`, now }), 0);
      assert.strictEqual(await lastSeen(), undefined);
      assert.strictEqual(await touchLastSeen(userId, { hashedToken: `${prefix}own`, now }), 1);
      assert.strictEqual((await lastSeen()).getTime(), now.getTime());
    });

    it('tells a member’s app use by verified email', async function () {
      await touchLastSeen(userId, { now });
      assert.deepStrictEqual(await memberAppActivity({ email: `${prefix}app@example.org` }), { hasAccount: true, lastSeenAt: now });
      assert.deepStrictEqual(await memberAppActivity({ email: `${prefix}none@example.org` }), { hasAccount: false, lastSeenAt: null });
      assert.deepStrictEqual(await memberAppActivity({}), { hasAccount: false, lastSeenAt: null });
    });

    it('does not count an unverified address', async function () {
      await Meteor.users.updateAsync(userId, { $set: { 'emails.0.verified': false } });
      assert.deepStrictEqual(await memberAppActivity({ email: `${prefix}app@example.org` }), { hasAccount: false, lastSeenAt: null });
    });

    it('puts both together for a member', async function () {
      const memberId = `${prefix}member`;
      await Members.insertAsync({ _id: memberId, mid: 'A1', name: 'Activity Test', email: `${prefix}app@example.org` });
      const activity = await memberActivity(memberId, { now });
      assert.deepStrictEqual(Object.keys(activity), ['scope', 'family', 'app', 'doors']);
      assert.strictEqual(activity.scope, 'member');
      assert.deepStrictEqual(activity.family, [{ _id: memberId, name: 'Activity Test' }]);
      assert.strictEqual(activity.app.hasAccount, true);
      assert.deepStrictEqual(activity.doors.total, { openings: 0, visits: 0 });
      await assert.rejects(() => memberActivity(`${prefix}missing`), /not-found/);
    });
  });

  describe('a family', function () {
    const payer = `${prefix}payer`;
    const partner = `${prefix}partner`;
    const child = `${prefix}child`;
    const stranger = `${prefix}stranger`;

    before(async function () {
      await Members.insertAsync({ _id: payer, mid: 'F1', name: 'Fam Payer', email: `${prefix}payer@example.org`, family: true });
      await Members.insertAsync({ _id: partner, mid: 'F2', name: 'Fam Partner', email: `${prefix}partner@example.org`, family: true, infamily: payer });
      await Members.insertAsync({ _id: child, mid: 'F3', name: 'Fam Child', email: `${prefix}child@example.org`, family: true, infamily: payer });
      await Members.insertAsync({ _id: stranger, mid: 'F4', name: 'Not Family', email: `${prefix}stranger@example.org` });
      const unlock = (memberid, iso) =>
        DoorUnlocks.insertAsync({ timestamp: new Date(iso), door: `${prefix}outerDoor`, memberid, method: 'app' });
      await unlock(payer, '2026-02-02T12:00:00Z');
      await unlock(partner, '2026-02-03T12:00:00Z');
      await unlock(partner, '2026-02-20T12:00:00Z');
      await unlock(partner, '2026-02-20T18:00:00Z');
      // The same day as the partner: a visit each.
      await unlock(payer, '2026-02-20T17:00:00Z');
      await unlock(child, '2026-01-10T12:00:00Z');
      await unlock(stranger, '2026-02-25T12:00:00Z');
    });

    after(async function () {
      await DoorUnlocks.removeAsync({ door: { $regex: `^${prefix}` } });
      await Members.removeAsync({ _id: { $regex: `^${prefix}` } });
    });

    it('counts the member alone by default', async function () {
      const { scope, doors } = await memberActivity(child, { now });
      assert.strictEqual(scope, 'member');
      assert.deepStrictEqual(doors.total, { openings: 1, visits: 1 });
    });

    it('counts the whole family on request, from any of its members', async function () {
      for (const memberId of [payer, partner, child]) {
        const { scope, family, doors } = await memberActivity(memberId, { scope: 'family', now });
        assert.strictEqual(scope, 'family');
        assert.deepStrictEqual(family.map((m) => m._id).sort(), [child, partner, payer].sort());
        assert.strictEqual(doors.total.openings, 6, 'the stranger’s opening is not the family’s');
        assert.strictEqual(doors.total.visits, 5, 'a visit per person and day: the partner’s two on the 20th are one');
        assert.strictEqual(doors.lastUnlock.memberid, partner, 'the latest is the partner’s');
        assert.deepStrictEqual(doors.days.find((d) => d.day === '2026-02-20'), { day: '2026-02-20', openings: 3, visits: 2 });
      }
    });

    it('is just the member outside a family', async function () {
      const { family, doors } = await memberActivity(stranger, { scope: 'family', now });
      assert.deepStrictEqual(family.map((m) => m._id), [stranger]);
      assert.deepStrictEqual(doors.total, { openings: 1, visits: 1 });
    });
  });
});
