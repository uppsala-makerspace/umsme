import assert from 'assert';
import {
  resolveEvent,
  inheritedFields,
  eventGroupId,
  mayEditActivity,
  mayBookEvent,
  disallowedHosts,
  eventEnd,
} from '/imports/common/lib/activityRules';

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

  describe('disallowedHosts', function () {
    it('names the hosts outside the group', function () {
      assert.deepStrictEqual(disallowedHosts({ hostMemberIds: ['m1', 'm9'], groupMemberIds: ['m1', 'm2'], isAdminish: false }), ['m9']);
    });

    it('lets board and admin choose anyone', function () {
      assert.deepStrictEqual(disallowedHosts({ hostMemberIds: ['m9'], groupMemberIds: [], isAdminish: true }), []);
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
});
