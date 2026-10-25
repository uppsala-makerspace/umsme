import assert from 'assert';
import { Groups } from '/imports/common/collections/groups';
import { GroupMemberships } from '/imports/common/collections/groupMemberships';
import { Members } from '/imports/common/collections/members';
import { Activities } from '/imports/common/collections/activities';
import { Events } from '/imports/common/collections/events';
import { ActivityCategories } from '/imports/common/collections/activityCategories';
import { AuditLog } from '/imports/common/collections/auditLog';
import { createActivity, updateActivity, removeActivity } from '/imports/common/server/activities/activities';
import { createEvent, updateEvent, removeEvent } from '/imports/common/server/activities/events';
import { createCategory, updateCategory, removeCategory } from '/imports/common/server/activities/categories';

const prefix = 'acttest-';
const userId = `${prefix}user`;
const alice = `${prefix}alice`;
const bob = `${prefix}bob`;
const board = { userId, isAdminish: true };
const member = { userId, isAdminish: false };
const start = new Date('2026-11-05T17:00:00Z');

const rejects = (promise, error) => assert.rejects(promise, (e) => e.error === error);

const cleanup = async () => {
  await Events.removeAsync({ createdBy: userId });
  await Activities.removeAsync({ createdBy: userId });
  await ActivityCategories.removeAsync({ 'name.sv': { $regex: `^${prefix}` } });
  await GroupMemberships.removeAsync({ memberId: { $regex: `^${prefix}` } });
  await Groups.removeAsync({ 'name.sv': { $regex: `^${prefix}` } });
  await Members.removeAsync({ _id: { $regex: `^${prefix}` } });
  await AuditLog.removeAsync({ userId });
};

describe('activities and events', function () {
  let groupId;
  let otherGroupId;

  before(async function () {
    await cleanup();
    await Members.insertAsync({ _id: alice, mid: 'A1', name: 'Alice Aktivitet', email: `${alice}@example.org` });
    await Members.insertAsync({ _id: bob, mid: 'A2', name: 'Bob Aktivitet', email: `${bob}@example.org` });
    groupId = await Groups.insertAsync({ name: { sv: `${prefix}Styrgrupp` }, type: 'steering' });
    otherGroupId = await Groups.insertAsync({ name: { sv: `${prefix}Annan` }, type: 'function' });
    await GroupMemberships.insertAsync({ groupId, memberId: alice, state: 'active', requestedAt: new Date() });
    await GroupMemberships.insertAsync({ groupId, memberId: bob, state: 'pending', requestedAt: new Date() });
  });

  after(cleanup);

  describe('activities', function () {
    it('creates, updates and records an activity', async function () {
      const id = await createActivity({ name: { sv: ' Intro ', en: '' }, groupId, durationMinutes: 90, membersOnly: false }, { userId });
      const created = await Activities.findOneAsync(id);
      assert.deepStrictEqual(created.name, { sv: 'Intro' });
      assert.strictEqual(created.membersOnly, false);
      assert.strictEqual(created.createdBy, userId);
      await updateActivity(id, { name: { sv: 'Intro', en: 'Intro' }, groupId }, { userId, expectedUpdatedAt: created.updatedAt });
      const updated = await Activities.findOneAsync(id);
      assert.strictEqual(updated.name.en, 'Intro');
      assert.strictEqual(updated.durationMinutes, undefined);
      assert.strictEqual(await AuditLog.find({ docId: id }).countAsync(), 2);
    });

    it('lets every group member book its events unless it says otherwise', async function () {
      const open = await createActivity({ name: { sv: 'Öppen' } }, { userId });
      assert.strictEqual((await Activities.findOneAsync(open)).eventBookers, 'groupMembers');
      const kept = await createActivity({ name: { sv: 'Styrd' }, eventBookers: 'activityEditors' }, { userId });
      assert.strictEqual((await Activities.findOneAsync(kept)).eventBookers, 'activityEditors');
      await rejects(createActivity({ name: { sv: 'Fel' }, eventBookers: 'anyone' }, { userId }), 'bad-value');
    });

    it('needs a Swedish name, and refuses what does not exist', async function () {
      await rejects(createActivity({ name: { en: 'Intro' } }, { userId }), 'bad-name');
      await rejects(createActivity({ name: { sv: 'Intro' }, groupId: 'nope' }, { userId }), 'not-found');
      await rejects(createActivity({ name: { sv: 'Intro' }, categoryId: 'nope' }, { userId }), 'not-found');
      await rejects(createActivity({ name: { sv: 'Intro' }, durationMinutes: 1.5 }, { userId }), 'bad-value');
    });

    it('refuses an update on a version someone else changed', async function () {
      const id = await createActivity({ name: { sv: 'Konflikt' } }, { userId });
      await rejects(updateActivity(id, { name: { sv: 'X' } }, { userId, expectedUpdatedAt: new Date(0) }), 'conflict');
    });

    it('takes its events along to a new group, and is not removed while it has them', async function () {
      const id = await createActivity({ name: { sv: 'Flytt' }, groupId }, { userId });
      const eventId = await createEvent({ activityId: id, start, end: new Date(start.getTime() + 3600000) }, board);
      assert.strictEqual((await Events.findOneAsync(eventId)).groupId, groupId);
      await updateActivity(id, { name: { sv: 'Flytt' }, groupId: otherGroupId }, { userId });
      assert.strictEqual((await Events.findOneAsync(eventId)).groupId, otherGroupId);
      await updateActivity(id, { name: { sv: 'Flytt' } }, { userId });
      assert.strictEqual((await Events.findOneAsync(eventId)).groupId, undefined);
      await rejects(removeActivity(id, { userId }), 'in-use');
      await removeEvent(eventId, { userId });
      await removeActivity(id, { userId });
      assert.strictEqual(await Activities.findOneAsync(id), undefined);
    });
  });

  describe('events', function () {
    let activityId;
    before(async function () {
      activityId = await createActivity({ name: { sv: 'Pyssel' }, groupId, durationMinutes: 120 }, { userId });
    });

    it("counts the end from the duration, its own or the activity's", async function () {
      const fromActivity = await createEvent({ activityId, start }, member);
      assert.strictEqual((await Events.findOneAsync(fromActivity)).end.getTime(), start.getTime() + 120 * 60000);
      const own = await createEvent({ activityId, start, durationMinutes: 30 }, member);
      assert.strictEqual((await Events.findOneAsync(own)).end.getTime(), start.getTime() + 30 * 60000);
      await rejects(createEvent({ name: { sv: 'Fritt' }, start }, board), 'bad-end');
      await rejects(createEvent({ activityId, start, end: start }, board), 'bad-end');
    });

    it('leaves what is not set to the activity', async function () {
      const id = await createEvent({ activityId, start, membersOnly: null, published: false }, member);
      const event = await Events.findOneAsync(id);
      assert.strictEqual(event.name, undefined);
      assert.strictEqual('membersOnly' in event, false);
      assert.strictEqual(event.published, false);
      assert.strictEqual(event.status, 'confirmed');
    });

    it('keeps the hosts to the group’s active members, unless board or admin choose', async function () {
      const id = await createEvent({ activityId, start, hostMemberIds: [alice, alice] }, member);
      assert.deepStrictEqual((await Events.findOneAsync(id)).hostMemberIds, [alice]);
      await rejects(createEvent({ activityId, start, hostMemberIds: [bob] }, member), 'bad-host');
      await rejects(createEvent({ activityId, start, hostMemberIds: ['nobody'] }, board), 'not-found');
      const chosen = await createEvent({ activityId, start, hostMemberIds: [bob] }, board);
      await rejects(updateEvent(chosen, { activityId, start, hostMemberIds: [bob] }, member), 'bad-host');
    });

    it('lets a free-standing event have its own group, or the association', async function () {
      await rejects(createEvent({ start, durationMinutes: 60 }, board), 'bad-name');
      const own = await createEvent({ name: { sv: 'Städdag' }, groupId, start, durationMinutes: 60, hostMemberIds: [alice] }, member);
      assert.strictEqual((await Events.findOneAsync(own)).groupId, groupId);
      const association = await createEvent({ name: { sv: 'Årsmöte' }, start, durationMinutes: 60 }, board);
      assert.strictEqual((await Events.findOneAsync(association)).groupId, undefined);
      await rejects(createEvent({ name: { sv: 'Årsmöte' }, start, durationMinutes: 60, hostMemberIds: [alice] }, member), 'bad-host');
    });

    it('cancels, and refuses an unknown status', async function () {
      const id = await createEvent({ activityId, start }, member);
      await updateEvent(id, { activityId, start, status: 'cancelled' }, member);
      assert.strictEqual((await Events.findOneAsync(id)).status, 'cancelled');
      await rejects(updateEvent(id, { activityId, start, status: 'maybe' }, member), 'bad-status');
    });
  });

  describe('categories', function () {
    it('creates, updates, and is not removed while used', async function () {
      const id = await createCategory({ name: { sv: `${prefix}Kurs` }, sortOrder: 2 }, { userId });
      await updateCategory(id, { name: { sv: `${prefix}Kurs`, en: 'Course' } }, { userId });
      const category = await ActivityCategories.findOneAsync(id);
      assert.deepStrictEqual([category.name.en, category.sortOrder], ['Course', undefined]);
      const activityId = await createActivity({ name: { sv: 'Kursen' }, categoryId: id }, { userId });
      await rejects(removeCategory(id, { userId }), 'in-use');
      await Activities.removeAsync(activityId);
      await removeCategory(id, { userId });
      assert.strictEqual(await ActivityCategories.findOneAsync(id), undefined);
      await rejects(createCategory({ name: { en: 'Course' } }, { userId }), 'bad-name');
    });
  });
});
