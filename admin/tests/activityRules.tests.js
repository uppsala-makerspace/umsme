import assert from 'assert';
import {
  resolveEvent,
  groupWorkshopIds,
  withGroupWorkshop,
  inheritedFields,
  eventGroupId,
  mayEditActivity,
  mayBookEvent,
  mayBookEventOf,
  disallowedHosts,
  eventEnd,
  checkInWindow,
  checkInApplies,
  lastCallDue,
  registerAgainAt,
} from '/imports/common/lib/activityRules';
import { zonedDate, zonedParts, zonedDay, zonedClock, zonedDayAt } from '/imports/common/lib/days';

const activity = {
  _id: 'a1',
  name: { sv: 'Introduktion träverkstaden', en: 'Woodshop introduction' },
  description: { sv: 'Grunderna.' },
  groupId: 'g1',
  workshopId: 'w1',
  imageFileId: 'f1',
  imageMimeType: 'image/png',
  durationMinutes: 120,
  membersOnly: true,
  published: true,
};

describe('Activity rules', function () {
  describe('resolveEvent', function () {
    it('takes what the event lacks from the activity', function () {
      const e = resolveEvent({ _id: 'e1', activityId: 'a1', start: new Date() }, activity);
      assert.deepStrictEqual(e.name, activity.name);
      assert.strictEqual(e.workshopId, 'w1');
      assert.strictEqual(e.durationMinutes, 120);
      assert.strictEqual(e._id, 'e1');
    });

    it('keeps what the event has of its own, false and empty texts too', function () {
      const e = resolveEvent({ name: { sv: 'Extra intro' }, membersOnly: false, slackChannel: '', description: { sv: '' } }, activity);
      assert.deepStrictEqual(e.name, { sv: 'Extra intro' });
      assert.strictEqual(e.membersOnly, false);
      assert.deepStrictEqual(e.description, activity.description);
    });

    it('takes the image with its type', function () {
      assert.strictEqual(resolveEvent({ imageMimeType: 'image/jpeg' }, activity).imageMimeType, 'image/png');
      const own = resolveEvent({ imageFileId: 'f2', imageMimeType: 'image/jpeg' }, activity);
      assert.deepStrictEqual([own.imageFileId, own.imageMimeType], ['f2', 'image/jpeg']);
    });

    it("always has the activity's group", function () {
      assert.strictEqual(resolveEvent({ groupId: 'other' }, activity).groupId, 'g1');
      assert.strictEqual('groupId' in resolveEvent({ groupId: 'other' }, { ...activity, groupId: undefined }), false);
    });

    it('leaves a free-standing event as it is', function () {
      const free = { name: { sv: 'Städdag' }, groupId: 'g2' };
      assert.deepStrictEqual(resolveEvent(free, null), free);
      assert.deepStrictEqual(inheritedFields(free, null), []);
    });

    it("takes whether the hosts are shown on the website, unless the event says", function () {
      const shown = { ...activity, hostsPublished: true };
      assert.strictEqual(resolveEvent({}, shown).hostsPublished, true);
      assert.strictEqual(resolveEvent({ hostsPublished: false }, shown).hostsPublished, false);
      assert.strictEqual(resolveEvent({ hostsPublished: true }, activity).hostsPublished, true);
      assert.strictEqual(resolveEvent({}, activity).hostsPublished, undefined);
    });

    it('tells which fields are inherited', function () {
      assert.deepStrictEqual(
        inheritedFields({ name: { en: 'Intro' }, durationMinutes: 60 }, activity),
        ['description', 'imageFileId', 'imageMimeType', 'workshopId', 'membersOnly', 'published'],
      );
    });
  });

  describe('eventGroupId', function () {
    it("is the activity's, or the event's own when free", function () {
      assert.strictEqual(eventGroupId({ groupId: 'x' }, activity), 'g1');
      assert.strictEqual(eventGroupId({ groupId: 'x' }, null), 'x');
      assert.strictEqual(eventGroupId({}, null), null);
    });
  });

  describe('mayEditActivity', function () {
    const steering = { _id: 'g1', type: 'steering' };
    const fn = { _id: 'g2', type: 'function' };

    it('lets board and admin edit anything, the association’s too', function () {
      assert.strictEqual(mayEditActivity({ isAdminish: true, group: null }), true);
    });

    it('keeps the association’s activities to board and admin', function () {
      assert.strictEqual(mayEditActivity({ isAdminish: false, group: null, isResponsible: true, membershipState: 'active' }), false);
    });

    it('follows the group rules otherwise', function () {
      assert.strictEqual(mayEditActivity({ isAdminish: false, group: steering, membershipState: 'active' }), true);
      assert.strictEqual(mayEditActivity({ isAdminish: false, group: steering, membershipState: 'pending' }), false);
      assert.strictEqual(mayEditActivity({ isAdminish: false, group: fn, membershipState: 'active' }), false);
      assert.strictEqual(mayEditActivity({ isAdminish: false, group: fn, isResponsible: true }), true);
    });

    it('lets the members of the steering group above an activity group edit its activities', function () {
      const below = { _id: 'g3', type: 'responsibility', parentGroupId: 'g1' };
      assert.strictEqual(mayEditActivity({ isAdminish: false, group: below, parentMembershipState: 'active' }), true);
      assert.strictEqual(mayEditActivity({ isAdminish: false, group: below, parentMembershipState: 'pending' }), false);
      assert.strictEqual(mayEditActivity({ isAdminish: false, group: below, membershipState: 'active' }), false);
      // Only an activity group: a function group's parent, were it to have one, decides nothing.
      assert.strictEqual(mayEditActivity({ isAdminish: false, group: { ...fn, parentGroupId: 'g1' }, parentMembershipState: 'active' }), false);
    });
  });

  describe('mayBookEvent', function () {
    it('lets every active member of the group book', function () {
      assert.strictEqual(mayBookEvent({ isAdminish: false, groupId: 'g1', membershipState: 'active' }), true);
      assert.strictEqual(mayBookEvent({ isAdminish: false, groupId: 'g1', membershipState: 'pending' }), false);
      assert.strictEqual(mayBookEvent({ isAdminish: false, groupId: 'g1' }), false);
    });

    it('keeps the association’s events to board and admin', function () {
      assert.strictEqual(mayBookEvent({ isAdminish: false, groupId: null, membershipState: 'active' }), false);
      assert.strictEqual(mayBookEvent({ isAdminish: true, groupId: null }), true);
    });
  });

  describe('mayBookEventOf', function () {
    it('follows the group for an activity open to its members', function () {
      assert.strictEqual(mayBookEventOf({ activity: { eventBookers: 'groupMembers' }, mayEdit: false, mayBook: true }), true);
      assert.strictEqual(mayBookEventOf({ activity: {}, mayEdit: false, mayBook: true }), true);
      assert.strictEqual(mayBookEventOf({ activity: null, mayEdit: false, mayBook: true }), true);
    });

    it('keeps the events of an activity to its editors when it says so', function () {
      const kept = { eventBookers: 'activityEditors' };
      assert.strictEqual(mayBookEventOf({ activity: kept, mayEdit: false, mayBook: true }), false);
      assert.strictEqual(mayBookEventOf({ activity: kept, mayEdit: true, mayBook: false }), true);
    });
  });

  describe('disallowedHosts', function () {
    it('names the hosts outside the group', function () {
      assert.deepStrictEqual(disallowedHosts({ hostMemberIds: ['m1', 'm9'], groupMemberIds: ['m1', 'm2'], isAdminish: false }), ['m9']);
    });

    it('lets board and admin choose anyone', function () {
      assert.deepStrictEqual(disallowedHosts({ hostMemberIds: ['m9'], groupMemberIds: [], isAdminish: true }), []);
    });
  });

  describe('Swedish time', function () {
    it('is the same wall time in summer and winter, whatever the server runs in', function () {
      assert.strictEqual(zonedDate(2026, 6, 1, 18, 0).toISOString(), '2026-07-01T16:00:00.000Z');
      assert.strictEqual(zonedDate(2026, 11, 1, 18, 0).toISOString(), '2026-12-01T17:00:00.000Z');
      const winter = new Date('2026-12-01T17:00:00Z');
      assert.deepStrictEqual([zonedDay(winter), zonedClock(winter)], ['2026-12-01', '18:00']);
    });

    it('rolls a day out of range over into the next month, and finds the night of the change', function () {
      assert.strictEqual(zonedDay(zonedDate(2026, 10, 0, 3, 0)), '2026-10-31');
      assert.strictEqual(zonedDate(2026, 9, 25, 3, 0).toISOString(), '2026-10-25T02:00:00.000Z');
      assert.strictEqual(zonedDate(2026, 2, 29, 3, 0).toISOString(), '2026-03-29T01:00:00.000Z');
    });
  });

  describe('registerAgainAt', function () {
    it('is an hour after giving up a seat, and null once passed or for anything else', function () {
      const released = new Date('2026-11-01T12:00:00Z');
      const withdrawn = { state: 'withdrawn', seatReleasedAt: released };
      assert.strictEqual(registerAgainAt(withdrawn, new Date('2026-11-01T12:30:00Z')).toISOString(), '2026-11-01T13:00:00.000Z');
      assert.strictEqual(registerAgainAt(withdrawn, new Date('2026-11-01T13:00:00Z')), null);
      assert.strictEqual(registerAgainAt({ state: 'withdrawn' }, released), null);
      assert.strictEqual(registerAgainAt({ state: 'approved', seatReleasedAt: released }, released), null);
      assert.strictEqual(registerAgainAt(null), null);
    });
  });

  describe('checkInWindow', function () {
    const start = zonedDate(2026, 10, 19, 18, 0);
    const local = (d) => { const p = zonedParts(d); return [p.day, p.hour, p.minute]; };

    it('is the day before, 03:00 to 15:00, by default', function () {
      const { opens, closes } = checkInWindow({ start, checkIn: 'default' });
      assert.deepStrictEqual([local(opens), local(closes)], [[18, 3, 0], [18, 15, 0]]);
    });

    it('follows a custom window, closing at the start at the latest', function () {
      const custom = { start, checkIn: 'custom', checkInOpensDaysBefore: 3, checkInOpensAt: '08:30', checkInClosesDaysBefore: 0, checkInClosesAt: '20:00' };
      const { opens, closes } = checkInWindow(custom);
      assert.deepStrictEqual([local(opens), closes.getTime()], [[16, 8, 30], start.getTime()]);
    });

    it('keeps to Swedish time across the change to winter time', function () {
      // Summer time ends in the night to Sunday 2026-10-25.
      const sunday = zonedDate(2026, 9, 25, 18, 0);
      const { opens, closes } = checkInWindow({ start: sunday, checkIn: 'default' });
      assert.deepStrictEqual([opens.toISOString(), closes.toISOString()], ['2026-10-24T01:00:00.000Z', '2026-10-24T13:00:00.000Z']);
      const monday = zonedDate(2026, 9, 26, 18, 0);
      assert.strictEqual(checkInWindow({ start: monday, checkIn: 'default' }).opens.toISOString(), '2026-10-25T02:00:00.000Z');
    });

    it('reminds a second time within two hours of closing, not within an hour of the first', function () {
      const event = { start, registration: 'required', checkIn: 'default' };
      const at = (clock) => zonedDayAt(start, -1, clock);
      assert.strictEqual(lastCallDue(event, at('03:00'), at('12:59')), false);
      assert.strictEqual(lastCallDue(event, at('03:00'), at('13:00')), true);
      assert.strictEqual(lastCallDue(event, at('12:30'), at('13:00')), false);
      assert.strictEqual(lastCallDue(event, at('03:00'), at('15:00')), false);
      assert.strictEqual(lastCallDue(event, null, at('13:00')), false);
    });

    it('applies only with registration and a window', function () {
      assert.strictEqual(checkInApplies({ registration: 'required', checkIn: 'default' }), true);
      assert.strictEqual(checkInApplies({ registration: 'required', checkIn: 'none' }), false);
      assert.strictEqual(checkInApplies({ registration: 'none', checkIn: 'custom' }), false);
    });
  });

  describe('eventEnd', function () {
    it('adds the length to the start', function () {
      assert.strictEqual(eventEnd(new Date('2026-11-01T18:00:00Z'), 90).toISOString(), '2026-11-01T19:30:00.000Z');
    });

    it('is null without a length', function () {
      assert.strictEqual(eventEnd(new Date(), undefined), null);
    });
  });

  describe('groupWorkshopIds and withGroupWorkshop', function () {
    const groups = [
      { _id: 'steer', type: 'steering' },
      { _id: 'sub', type: 'responsibility', parentGroupId: 'steer' },
      { _id: 'func', type: 'function' },
      { _id: 'twice', type: 'steering' },
      { _id: 'subOfTwice', type: 'responsibility', parentGroupId: 'twice' },
      { _id: 'lonely', type: 'steering' },
      { _id: 'gone', type: 'steering' },
    ];
    const workshops = [
      { _id: 'wood', groupId: 'steer', status: 'established' },
      { _id: 'a', groupId: 'twice', status: 'established' },
      { _id: 'b', groupId: 'twice', status: 'trial' },
      { _id: 'old', groupId: 'gone', status: 'decommissioned' },
    ];
    const map = groupWorkshopIds(groups, workshops);

    it("gives a steering group the one it is responsible for, and an activity group its steering group's", function () {
      assert.strictEqual(map.steer, 'wood');
      assert.strictEqual(map.sub, 'wood');
    });

    it('gives none to a function group, to one responsible for several or none, or for a decommissioned one', function () {
      for (const id of ['func', 'twice', 'subOfTwice', 'lonely', 'gone']) assert.strictEqual(map[id], undefined, id);
    });

    it("fills in the group's workshop only where none is named, and marks it", function () {
      assert.deepStrictEqual(withGroupWorkshop({ _id: 'x', groupId: 'sub' }, map), { _id: 'x', groupId: 'sub', workshopId: 'wood', workshopFromGroup: true });
      assert.deepStrictEqual(withGroupWorkshop({ _id: 'x', groupId: 'sub', workshopId: 'a' }, map), { _id: 'x', groupId: 'sub', workshopId: 'a' });
      assert.deepStrictEqual(withGroupWorkshop({ _id: 'x', groupId: 'func' }, map), { _id: 'x', groupId: 'func' });
    });

    it("lets an activity's event take the group's workshop through the activity", function () {
      const activity = withGroupWorkshop({ _id: 'act', groupId: 'sub', name: { sv: 'Glasyr' } }, map);
      assert.strictEqual(resolveEvent({ _id: 'e', activityId: 'act' }, activity).workshopId, 'wood');
      assert.strictEqual(resolveEvent({ _id: 'e', activityId: 'act', workshopId: 'a' }, activity).workshopId, 'a');
    });
  });
});
