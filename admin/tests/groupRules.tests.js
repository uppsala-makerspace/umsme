import assert from 'assert';
import { canRequestToJoin, mayEditGroup } from '/imports/common/lib/groupRules';

describe('Group rules', function () {
  describe('mayEditGroup', function () {
    const may = (args) => mayEditGroup({ isResponsible: false, membershipState: null, ...args });

    it('lets the responsible edit whatever the type', function () {
      for (const groupType of ['steering', 'function', 'interest', 'responsibility']) {
        assert.strictEqual(may({ isResponsible: true, groupType }), true, groupType);
      }
    });

    it('lets any member of a steering group edit', function () {
      assert.strictEqual(may({ groupType: 'steering', membershipState: 'active' }), true);
    });

    it('keeps every other type to its responsible', function () {
      for (const groupType of ['function', 'interest', 'responsibility']) {
        assert.strictEqual(may({ groupType, membershipState: 'active' }), false, groupType);
      }
    });

    it('does not count a pending request as membership', function () {
      assert.strictEqual(may({ groupType: 'steering', membershipState: 'pending' }), false);
    });

    it('says no to someone outside the group', function () {
      assert.strictEqual(may({ groupType: 'steering' }), false);
      assert.strictEqual(may({ groupType: 'interest' }), false);
    });
  });

  describe('canRequestToJoin', function () {
    it('lets members ask to join a group without the field', function () {
      // Every group predates the field; closing them all would be a silent
      // change to how the whole app works.
      assert.strictEqual(canRequestToJoin({ _id: 'g1', type: 'interest' }), true);
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
});
