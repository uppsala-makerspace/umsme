import assert from 'assert';
import { Groups } from '/imports/common/collections/groups';
import { Workshops } from '/imports/common/collections/workshops';
import { GroupMemberships } from '/imports/common/collections/groupMemberships';
import { ExpenseAccounts } from '/imports/common/collections/expenseAccounts';
import { Members } from '/imports/common/collections/members';
import runMigrations, { areaOfInterestFromGroup } from '../server/migrations';

const prefix = 'area-of-interest-migration-test:';
const id = (name) => `${prefix}${name}`;

// Raw collections: the fixtures include type 'interest', which the schema no
// longer allows — exactly the data the migration exists for.
const raw = {
  groups: () => Groups.rawCollection(),
  workshops: () => Workshops.rawCollection(),
  memberships: () => GroupMemberships.rawCollection(),
  accounts: () => ExpenseAccounts.rawCollection(),
  members: () => Members.rawCollection(),
};

const cleanup = async () => {
  const mine = { _id: { $regex: `^${prefix}` } };
  for (const collection of Object.values(raw)) await collection().deleteMany(mine);
};

describe('interest group to area of interest migration', function () {
  describe('areaOfInterestFromGroup', function () {
    it('keeps the id and the shared fields, and takes the steering group as groupId', function () {
      const doc = areaOfInterestFromGroup({
        _id: 'g1',
        type: 'interest',
        name: { sv: 'Lördagskurser' },
        imageFileId: 'img',
        primarySpaceId: 's1',
        secondarySpaceIds: ['s2'],
        steeringGroupId: 'g2',
        responsibleMemberId: 'm1',
        joinPolicy: 'open',
      });
      assert.deepStrictEqual(doc, {
        _id: 'g1',
        kind: 'areaOfInterest',
        status: 'established',
        name: { sv: 'Lördagskurser' },
        imageFileId: 'img',
        primarySpaceId: 's1',
        secondarySpaceIds: ['s2'],
        groupId: 'g2',
      });
    });

    it('leaves groupId out when there is no steering group', function () {
      assert.ok(!('groupId' in areaOfInterestFromGroup({ _id: 'g1', name: { sv: 'X' } })));
    });
  });

  describe('runMigrations', function () {
    beforeEach(async function () {
      await cleanup();
      await raw.groups().insertMany([
        { _id: id('steering'), type: 'steering', name: { sv: 'Handledare' } },
        {
          _id: id('interest'),
          type: 'interest',
          name: { sv: 'Lördagskurser' },
          imageFileId: 'img',
          steeringGroupId: id('steering'),
        },
        { _id: id('related'), type: 'function', name: { sv: 'IT' }, relatedGroupIds: [id('interest')] },
      ]);
      await raw.workshops().insertOne({ _id: id('old-workshop'), name: { sv: 'Träverkstad' } });
      await raw.members().insertOne({ _id: id('member'), name: 'Anna', mid: '123' });
      await raw.memberships().insertOne({
        _id: id('membership'),
        groupId: id('interest'),
        memberId: id('member'),
        state: 'active',
      });
      await raw.accounts().insertOne({
        _id: id('account'),
        name: 'Kurser',
        groupIds: [id('interest'), id('steering')],
      });
    });

    afterEach(cleanup);

    it('turns the interest group into an area of interest run by its steering group', async function () {
      await runMigrations();
      const area = await raw.workshops().findOne({ _id: id('interest') });
      assert.strictEqual(area.kind, 'areaOfInterest');
      assert.strictEqual(area.groupId, id('steering'));
      assert.strictEqual(area.imageFileId, 'img');
      assert.strictEqual(await raw.groups().findOne({ _id: id('interest') }), null);
    });

    it('moves references over and drops the memberships', async function () {
      await runMigrations();
      const related = await raw.groups().findOne({ _id: id('related') });
      assert.deepStrictEqual(related.relatedGroupIds, []);
      assert.deepStrictEqual(related.relatedWorkshopIds, [id('interest')]);
      const account = await raw.accounts().findOne({ _id: id('account') });
      assert.deepStrictEqual(account.groupIds, [id('steering')]);
      assert.strictEqual(await raw.memberships().countDocuments({ groupId: id('interest') }), 0);
    });

    it('clears steeringGroupId and names the kind of older workshops', async function () {
      await raw.groups().updateOne({ _id: id('related') }, { $set: { steeringGroupId: id('steering') } });
      await runMigrations();
      const related = await raw.groups().findOne({ _id: id('related') });
      assert.ok(!('steeringGroupId' in related));
      const old = await raw.workshops().findOne({ _id: id('old-workshop') });
      assert.strictEqual(old.kind, 'workshop');
    });

    it('is idempotent', async function () {
      await runMigrations();
      await runMigrations();
      assert.strictEqual(await raw.workshops().countDocuments({ _id: id('interest') }), 1);
    });
  });
});
