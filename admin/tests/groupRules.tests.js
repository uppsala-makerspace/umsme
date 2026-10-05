import assert from 'assert';
import {
  canRequestToJoin,
  mayEditGroup,
  GROUP_TYPES,
  isAreaOfInterest,
  workshopCompleteness,
} from '/imports/common/lib/groupRules';

describe('Group rules', function () {
  describe('mayEditGroup', function () {
    const may = (args) => mayEditGroup({ isResponsible: false, membershipState: null, ...args });

    it('lets the responsible edit whatever the type', function () {
      for (const groupType of GROUP_TYPES) {
        assert.strictEqual(may({ isResponsible: true, groupType }), true, groupType);
      }
    });

    it('lets any member of a steering group edit', function () {
      assert.strictEqual(may({ groupType: 'steering', membershipState: 'active' }), true);
    });

    it('keeps every other type to its responsible', function () {
      for (const groupType of ['function', 'responsibility']) {
        assert.strictEqual(may({ groupType, membershipState: 'active' }), false, groupType);
      }
    });

    it('does not count a pending request as membership', function () {
      assert.strictEqual(may({ groupType: 'steering', membershipState: 'pending' }), false);
    });

    it('says no to someone outside the group', function () {
      assert.strictEqual(may({ groupType: 'steering' }), false);
      assert.strictEqual(may({ groupType: 'function' }), false);
    });
  });

  describe('canRequestToJoin', function () {
    it('lets members ask to join a group without the field', function () {
      // Every group predates the field; closing them all would be a silent
      // change to how the whole app works.
      assert.strictEqual(canRequestToJoin({ _id: 'g1', type: 'function' }), true);
    });

    it('follows the flag when it is set', function () {
      assert.strictEqual(canRequestToJoin({ allowJoinRequests: true }), true);
      assert.strictEqual(canRequestToJoin({ allowJoinRequests: false }), false);
    });

    it('does not treat a missing group as closed', function () {
      // The caller decides what to do without a group; this must not be the
      // thing that quietly returns "closed" and hides a bug.
      assert.strictEqual(canRequestToJoin(undefined), true);
      assert.strictEqual(canRequestToJoin(null), true);
    });
  });
  describe('group types', function () {
    it('has no interest groups — areas of interest replaced them', function () {
      assert.deepStrictEqual(GROUP_TYPES, ['steering', 'function', 'responsibility']);
    });
  });

  describe('workshopCompleteness', function () {
    const steering = { _id: 'g1', type: 'steering' };
    const full = {
      name: { sv: 'Träverkstad' },
      description: { sv: 'Snickra.' },
      imageFileId: 'img',
      slackChannel: 'tra',
      groupId: 'g1',
    };

    it('reads a workshop without a kind as a workshop', function () {
      assert.strictEqual(isAreaOfInterest(full), false);
      assert.strictEqual(isAreaOfInterest({ ...full, kind: 'areaOfInterest' }), true);
    });

    it('needs two active steering members for a workshop', function () {
      assert.deepStrictEqual(workshopCompleteness(full, steering, 1).missing, ['groupMembers']);
      assert.strictEqual(workshopCompleteness(full, steering, 2).complete, true);
    });

    it('needs only one active steering member for an area of interest', function () {
      const area = { ...full, kind: 'areaOfInterest', name: { sv: 'Vinylskärning' } };
      assert.strictEqual(workshopCompleteness(area, steering, 1).complete, true);
      assert.deepStrictEqual(workshopCompleteness(area, steering, 0).missing, ['groupMembers']);
    });

    it('warns about the name suffix only for workshops', function () {
      const named = { ...full, name: { sv: 'Vinylskärning' } };
      assert.deepStrictEqual(workshopCompleteness(named, steering, 2).warnings, ['nameSuffix']);
      assert.deepStrictEqual(
        workshopCompleteness({ ...named, kind: 'areaOfInterest' }, steering, 2).warnings,
        []
      );
    });
  });
});
