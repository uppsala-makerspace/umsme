import assert from 'assert';
import { Members } from '/imports/common/collections/members';
import { LiabilityDocuments } from '/imports/common/collections/liabilityDocuments';
import { memberValues, memberFields } from '/imports/ui/members/MemberForm';
import { liabilityDatesOnVersions } from '../server/migrations';

// A member's liability date must be the very instant of the version they
// approved (midnight UTC): the app and the doors compare them exactly.
describe('liability dates', function () {
  const version = new Date('2025-06-10T00:00:00Z');

  it('keeps the version\'s instant through a save of the member form', function () {
    const values = memberValues({ name: 'X', liabilityDate: version });
    assert.strictEqual(values.liabilityDate, '2025-06-10');
    assert.strictEqual(memberFields(values).liabilityDate.getTime(), version.getTime());
  });

  describe('migration back onto the versions', function () {
    const prefix = 'liability-dates-test:';
    afterEach(async function () {
      await Members.rawCollection().deleteMany({ _id: { $regex: `^${prefix}` } });
      await LiabilityDocuments.rawCollection().deleteMany({ _id: { $regex: `^${prefix}` } });
    });

    it('puts a date a couple of hours off a version on it, and leaves the rest', async function () {
      await LiabilityDocuments.rawCollection().insertOne({ _id: `${prefix}v`, title: 'T', date: version });
      await Members.rawCollection().insertMany([
        { _id: `${prefix}moved`, name: 'Moved', liabilityDate: new Date('2025-06-09T22:00:00Z') },
        { _id: `${prefix}right`, name: 'Right', liabilityDate: version },
        { _id: `${prefix}other`, name: 'Other', liabilityDate: new Date('2024-01-01T00:00:00Z') },
      ]);
      await liabilityDatesOnVersions();
      const byId = Object.fromEntries((await Members.rawCollection().find({ _id: { $regex: `^${prefix}` } }).toArray())
        .map((m) => [m._id.slice(prefix.length), m.liabilityDate.toISOString()]));
      assert.deepStrictEqual(byId, {
        moved: '2025-06-10T00:00:00.000Z',
        right: '2025-06-10T00:00:00.000Z',
        other: '2024-01-01T00:00:00.000Z',
      });
    });
  });
});
