import assert from 'assert';
import { canRequestToJoin } from '/imports/common/lib/groupRules';

describe('Group rules', function () {
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
