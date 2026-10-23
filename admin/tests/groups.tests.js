import assert from 'assert';
import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/roles';
import { Groups } from '/imports/common/collections/groups';
import { GroupMemberships } from '/imports/common/collections/groupMemberships';
import { Workshops } from '/imports/common/collections/workshops';
import { Members } from '/imports/common/collections/members';
import { Certificates } from '/imports/common/collections/certificates';
import { StoreItems } from '/imports/common/collections/storeItems';
import { ExpenseAccounts } from '/imports/common/collections/expenseAccounts';
import { AuditLog } from '/imports/common/collections/auditLog';
import '/server/methods/groups';
import '/server/methods/workshops';
import '/server/methods/memberLookup';
import registerPublications from '/server/publications';

const prefix = 'grptest-';
const board = `${prefix}board`;
const treasurer = `${prefix}treasurer`;
const alice = `${prefix}alice`;
const bob = `${prefix}bob`;
const roleName = `${prefix}role`;

const call = (userId, name, ...args) =>
  Meteor.server.method_handlers[name].apply({ userId, isSimulation: false }, args);

const group = (overrides = {}) => ({ name: { sv: `${prefix}Grupp` }, type: 'function', ...overrides });
const workshop = (overrides = {}) => ({ name: { sv: `${prefix}Verkstaden` }, kind: 'workshop', status: 'forming', ...overrides });

const cleanup = async () => {
  const groupIds = (await Groups.find({ 'name.sv': { $regex: `^${prefix}` } }).fetchAsync()).map((g) => g._id);
  await GroupMemberships.removeAsync({ groupId: { $in: groupIds } });
  await Workshops.removeAsync({ 'name.sv': { $regex: `^${prefix}` } });
  await Certificates.removeAsync({ 'name.sv': { $regex: `^${prefix}` } });
  await StoreItems.rawCollection().deleteMany({ code: { $regex: `^${prefix}` } });
  await ExpenseAccounts.rawCollection().deleteMany({ name: { $regex: `^${prefix}` } });
  await Groups.removeAsync({ _id: { $in: groupIds } });
  await AuditLog.removeAsync({ userId: { $regex: `^${prefix}` } });
  await Meteor.roleAssignment.removeAsync({ 'role._id': roleName });
};

describe('groups and workshops', function () {
  before(async function () {
    if (!Meteor.server.publish_handlers['admin.groups.list']) registerPublications();
    await Meteor.roleAssignment.removeAsync({ 'user._id': { $regex: `^${prefix}` } });
    await Meteor.users.removeAsync({ _id: { $regex: `^${prefix}` } });
    await Members.removeAsync({ _id: { $regex: `^${prefix}` } });
    for (const [_id, role] of [[board, 'board'], [treasurer, 'treasurer']]) {
      await Roles.createRoleAsync(role, { unlessExists: true });
      await Meteor.users.insertAsync({ _id, emails: [{ address: `${_id}@example.org` }] });
      await Roles.addUsersToRolesAsync(_id, role, null);
    }
    await Roles.createRoleAsync(roleName, { unlessExists: true });
    await Members.insertAsync({ _id: alice, mid: 'G1', name: 'Alice Grupptest', email: `${alice}@example.org` });
    await Members.insertAsync({ _id: bob, mid: 'G2', name: 'Bob Grupptest', email: `${bob}@example.org` });
  });

  after(async function () {
    await cleanup();
    await Members.removeAsync({ _id: { $regex: `^${prefix}` } });
    await Meteor.roles.removeAsync({ _id: roleName });
    await Meteor.roleAssignment.removeAsync({ 'user._id': { $regex: `^${prefix}` } });
    await Meteor.users.removeAsync({ _id: { $regex: `^${prefix}` } });
  });

  afterEach(cleanup);

  describe('groups', function () {
    it('creates a group, its responsible an active member, and logs it', async function () {
      const docId = await call(board, 'groups.create', group({ responsibleMemberId: alice, description: { sv: ' Om ' } }));
      const doc = await Groups.findOneAsync(docId);
      assert.deepStrictEqual(doc.description, { sv: 'Om' });
      assert.strictEqual((await GroupMemberships.findOneAsync({ groupId: docId, memberId: alice })).state, 'active');
      assert.strictEqual((await AuditLog.findOneAsync({ docId })).action, 'create');
    });

    it('refuses the treasurer', async function () {
      await assert.rejects(call(treasurer, 'groups.create', group()), /not-authorized/);
    });

    it('never links the admin role, nor a role to an open group', async function () {
      await assert.rejects(call(board, 'groups.create', group({ linkedRole: 'admin' })), /bad-role/);
      await assert.rejects(call(board, 'groups.create', group({ linkedRole: roleName, joinPolicy: 'open' })), /open-with-role/);
    });

    it('needs a steering group as the parent of a responsibility group', async function () {
      await assert.rejects(call(board, 'groups.create', group({ type: 'responsibility' })), /parent-required/);
      const functionGroup = await call(board, 'groups.create', group());
      await assert.rejects(call(board, 'groups.create', group({ type: 'responsibility', parentGroupId: functionGroup })), /bad-parent/);
      const steering = await call(board, 'groups.create', group({ type: 'steering' }));
      await call(board, 'groups.create', group({ type: 'responsibility', parentGroupId: steering }));
    });

    it('keeps a steering group a steering group while a workshop depends on it', async function () {
      const steering = await call(board, 'groups.create', group({ type: 'steering' }));
      await call(board, 'workshops.create', workshop({ groupId: steering }));
      const { updatedAt } = await Groups.findOneAsync(steering);
      await assert.rejects(call(board, 'groups.update', steering, group({ type: 'function' }), updatedAt), /steering-in-use/);
    });

    it('saves related groups and workshops, never itself, and refuses a stale edit', async function () {
      const other = await call(board, 'groups.create', group());
      const ws = await call(board, 'workshops.create', workshop());
      const docId = await call(board, 'groups.create', group());
      const { updatedAt } = await Groups.findOneAsync(docId);
      const next = group({ relatedGroupIds: [other, docId], relatedWorkshopIds: [ws] });
      await call(board, 'groups.update', docId, next, updatedAt);
      const doc = await Groups.findOneAsync(docId);
      assert.deepStrictEqual(doc.relatedGroupIds, [other]);
      assert.deepStrictEqual(doc.relatedWorkshopIds, [ws]);
      await assert.rejects(call(board, 'groups.update', docId, next, updatedAt), /conflict/);
    });

    it('syncs the linked role from the active members', async function () {
      const docId = await call(board, 'groups.create', group({ linkedRole: roleName }));
      const user = `${prefix}alice-user`;
      await Meteor.users.insertAsync({ _id: user, emails: [{ address: `${alice}@example.org`, verified: true }] });
      try {
        await call(board, 'groups.addMember', docId, alice);
        assert.ok(await Roles.userIsInRoleAsync(user, roleName));
        await call(board, 'groups.removeMember', docId, alice);
        assert.ok(!(await Roles.userIsInRoleAsync(user, roleName)));
      } finally {
        await Meteor.users.removeAsync(user);
      }
    });

    it('approves and rejects requests, and keeps the responsible', async function () {
      const docId = await call(board, 'groups.create', group({ responsibleMemberId: alice }));
      await GroupMemberships.insertAsync({ groupId: docId, memberId: bob, state: 'pending', requestedAt: new Date() });
      await call(board, 'groups.rejectRequest', docId, bob);
      assert.strictEqual(await GroupMemberships.findOneAsync({ groupId: docId, memberId: bob }), undefined);
      await GroupMemberships.insertAsync({ groupId: docId, memberId: bob, state: 'pending', requestedAt: new Date() });
      await call(board, 'groups.addMember', docId, bob);
      assert.strictEqual((await GroupMemberships.findOneAsync({ groupId: docId, memberId: bob })).state, 'active');
      await assert.rejects(call(board, 'groups.removeMember', docId, alice), /is-responsible/);
    });

    it('removes a group nothing refers to, but not one with members', async function () {
      const free = await call(board, 'groups.create', group());
      await call(board, 'groups.remove', free);
      const used = await call(board, 'groups.create', group({ responsibleMemberId: alice }));
      await assert.rejects(call(board, 'groups.remove', used), /in-use/);
    });
  });

  describe('workshops', function () {
    it('creates and updates a workshop, refusing a group that is not steering', async function () {
      const functionGroup = await call(board, 'groups.create', group());
      await assert.rejects(call(board, 'workshops.create', workshop({ groupId: functionGroup })), /bad-group/);
      const docId = await call(board, 'workshops.create', workshop({ slackChannel: '#v' }));
      const { updatedAt } = await Workshops.findOneAsync(docId);
      await call(board, 'workshops.update', docId, workshop({ status: 'trial', slackChannel: '' }), updatedAt);
      const doc = await Workshops.findOneAsync(docId);
      assert.strictEqual(doc.status, 'trial');
      assert.strictEqual('slackChannel' in doc, false);
    });

    it('counts the steering group and lists the certificates', async function () {
      const steering = await call(board, 'groups.create', group({ type: 'steering', responsibleMemberId: alice }));
      const docId = await call(board, 'workshops.create', workshop({ groupId: steering }));
      await Certificates.insertAsync({ name: { sv: `${prefix}Cert` }, workshopId: docId });
      const details = await call(board, 'workshops.details', docId);
      assert.strictEqual(details.activeMemberCount, 1);
      assert.deepStrictEqual(details.certificates.map((c) => c.name.sv), [`${prefix}Cert`]);
      await assert.rejects(call(board, 'workshops.remove', docId), /in-use/);
    });

    it('lists what refers to a workshop, directly and through its steering group, and keeps it while anything does directly', async function () {
      const steering = await call(board, 'groups.create', group({ type: 'steering', responsibleMemberId: alice }));
      const docId = await call(board, 'workshops.create', workshop({ groupId: steering }));
      await StoreItems.rawCollection().insertOne({ _id: `${prefix}item`, code: `${prefix}lera`, name: { sv: 'Lera' }, workshopIds: [docId] });
      const related = await call(board, 'groups.create', group({ relatedWorkshopIds: [docId] }));
      const child = await call(board, 'groups.create', group({ name: { sv: `${prefix}Ansvar` }, type: 'responsibility', parentGroupId: steering, responsibleMemberId: alice }));
      await ExpenseAccounts.rawCollection().insertOne({ _id: `${prefix}acct`, name: `${prefix}Konto`, groupIds: [], approverGroupIds: [steering] });
      const details = await call(board, 'workshops.details', docId);
      assert.deepStrictEqual(details.storeItems.map((i) => i._id), [`${prefix}item`]);
      assert.deepStrictEqual(details.relatedGroups.map((g) => g._id), [related]);
      assert.strictEqual(details.viaGroup.group._id, steering);
      assert.deepStrictEqual(details.viaGroup.responsibilityGroups.map((g) => g._id), [child]);
      assert.deepStrictEqual(details.viaGroup.expenseAccounts, [{ _id: `${prefix}acct`, name: `${prefix}Konto`, member: false, approver: true }]);
      await assert.rejects(call(board, 'workshops.remove', docId), /store items are sold for it and groups are related to it/);
    });
  });

  describe('member lookup', function () {
    it('finds members by every word, and refuses the treasurer', async function () {
      const found = await call(board, 'adminMembers.search', 'grupptest ali');
      assert.deepStrictEqual(found.map((m) => m._id), [alice]);
      assert.deepStrictEqual(Object.keys(found[0]).sort(), ['_id', 'email', 'mid', 'name']);
      await assert.rejects(call(treasurer, 'adminMembers.search', 'alice'), /not-authorized/);
    });
  });
});
