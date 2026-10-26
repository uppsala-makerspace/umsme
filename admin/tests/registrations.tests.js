import assert from 'assert';
import { Members } from '/imports/common/collections/members';
import { Activities } from '/imports/common/collections/activities';
import { Events } from '/imports/common/collections/events';
import { EventRegistrations } from '/imports/common/collections/eventRegistrations';
import { ActivityInterests } from '/imports/common/collections/activityInterests';
import { Attestations } from '/imports/common/collections/attestations';
import { Certificates } from '/imports/common/collections/certificates';
import { Messages } from '/imports/common/collections/messages';
import { AuditLog } from '/imports/common/collections/auditLog';
import { createActivity } from '/imports/common/server/activities/activities';
import { createEvent, updateEvent, removeEvent } from '/imports/common/server/activities/events';
import {
  register, withdraw, takeSeat, checkIn, setInterest, markAttended, closeAttendance,
  sendCheckInReminders, passCheckInDeadlines,
} from '/imports/common/server/activities/registrations';
import { setActivityTransportsForTests } from '/imports/common/server/activities/notify';
import { ensureActivityMessageTemplates } from '/imports/common/server/activities/defaultTemplates';

const prefix = 'regtest-';
const userId = `${prefix}user`;
const board = { userId, isAdminish: true };
const members = ['a', 'b', 'c', 'd'].map((k) => `${prefix}${k}`);
const [a, b, c, d] = members;
const HOUR = 3600000;
const inHours = (n) => new Date(Date.now() + n * HOUR);

const rejects = (promise, error) => assert.rejects(promise, (e) => e.error === error);
const stateOf = async (eventId, memberId) => (await EventRegistrations.findOneAsync({ eventId, memberId }))?.state;
const eventOf = (eventId) => Events.findOneAsync(eventId);

const cleanup = async () => {
  const events = (await Events.find({ createdBy: userId }).fetchAsync()).map((e) => e._id);
  await EventRegistrations.removeAsync({ eventId: { $in: events } });
  await Events.removeAsync({ createdBy: userId });
  const activities = (await Activities.find({ createdBy: userId }).fetchAsync()).map((x) => x._id);
  await ActivityInterests.removeAsync({ activityId: { $in: activities } });
  await Activities.removeAsync({ createdBy: userId });
  await Attestations.removeAsync({ memberId: { $in: members } });
  await Certificates.removeAsync({ 'name.sv': { $regex: `^${prefix}` } });
  await Messages.removeAsync({ member: { $in: members } });
  await Members.removeAsync({ _id: { $in: members } });
  await AuditLog.removeAsync({ userId });
};

describe('event registrations', function () {
  const pushed = [];

  before(async function () {
    await cleanup();
    await ensureActivityMessageTemplates();
    setActivityTransportsForTests({ sendEmail: async () => {}, sendPush: async (id) => { pushed.push(id); } });
    for (const [i, _id] of members.entries()) {
      await Members.insertAsync({ _id, mid: `R${i}`, name: `Reg ${i}`, email: `${_id}@example.org` });
    }
  });

  after(async function () {
    setActivityTransportsForTests(null);
    await cleanup();
  });

  const makeEvent = (fields = {}) => createEvent({
    name: { sv: `${prefix}Kurs` }, start: inHours(48), durationMinutes: 60, registration: 'required', ...fields,
  }, board);

  it('gives seats until full, then the queue, then refuses', async function () {
    const id = await makeEvent({ maxSeats: 2, queueAllowed: true });
    assert.strictEqual(await register(id, a, { userId }), 'approved');
    assert.strictEqual(await register(id, b, { userId }), 'approved');
    assert.strictEqual(await register(id, c, { userId }), 'queued');
    assert.strictEqual((await eventOf(id)).seatsTaken, 2);
    await rejects(register(id, a, { userId }), 'registered');
    const full = await makeEvent({ maxSeats: 1 });
    await register(full, a, { userId });
    await rejects(register(full, b, { userId }), 'full');
  });

  it('sends a message of the right type to the member', async function () {
    const id = await makeEvent({ maxSeats: 1, queueAllowed: true });
    await register(id, a, { userId });
    await register(id, b, { userId });
    const subjects = (await Messages.find({ member: { $in: [a, b] }, type: 'activity' }, { sort: { senddate: -1 } }).fetchAsync()).map((m) => m.subject);
    assert.ok(subjects.some((s) => s.startsWith('Du är anmäld')));
    assert.ok(subjects.some((s) => s.startsWith('Du står i kö')));
    assert.ok(pushed.length > 0);
  });

  it('frees a seat on withdrawal, tells the queue, and lets the first to take it have it', async function () {
    const id = await makeEvent({ maxSeats: 1, queueAllowed: true });
    await register(id, a, { userId });
    await register(id, b, { userId });
    await register(id, c, { userId });
    const before = await Messages.find({ member: { $in: [b, c] }, subject: /^En plats är ledig/ }).countAsync();
    await withdraw(id, a, { userId });
    assert.strictEqual(await stateOf(id, a), 'withdrawn');
    assert.strictEqual(await Messages.find({ member: { $in: [b, c] }, subject: /^En plats är ledig/ }).countAsync(), before + 2);
    assert.strictEqual(await takeSeat(id, c, { userId }), 'approved');
    await rejects(takeSeat(id, b, { userId }), 'taken');
    assert.strictEqual(await stateOf(id, b), 'queued');
    assert.strictEqual((await eventOf(id)).seatsTaken, 1);
  });

  it('gives a free seat to a new registration too, the queue having no precedence', async function () {
    const id = await makeEvent({ maxSeats: 1, queueAllowed: true });
    await register(id, a, { userId });
    await register(id, b, { userId });
    await withdraw(id, a, { userId });
    assert.strictEqual(await register(id, c, { userId }), 'approved');
    await rejects(takeSeat(id, b, { userId }), 'taken');
    assert.strictEqual(await stateOf(id, b), 'queued');
    assert.strictEqual((await eventOf(id)).seatsTaken, 1);
  });

  it('never gives the last seat twice when two take it at once', async function () {
    const id = await makeEvent({ maxSeats: 1, queueAllowed: true });
    await register(id, a, { userId });
    await register(id, b, { userId });
    await register(id, c, { userId });
    await withdraw(id, a, { userId });
    const results = await Promise.allSettled([takeSeat(id, b, { userId }), takeSeat(id, c, { userId })]);
    assert.strictEqual(results.filter((r) => r.status === 'fulfilled').length, 1);
    assert.strictEqual((await eventOf(id)).seatsTaken, 1);
  });

  it('waits for its fewest participants, then happens for good', async function () {
    const id = await makeEvent({ minSeats: 2, maxSeats: 5 });
    assert.strictEqual((await eventOf(id)).status, 'awaiting');
    await register(id, a, { userId });
    assert.strictEqual((await eventOf(id)).status, 'awaiting');
    await register(id, b, { userId });
    assert.strictEqual((await eventOf(id)).status, 'confirmed');
    await withdraw(id, b, { userId });
    assert.strictEqual((await eventOf(id)).status, 'confirmed');
  });

  it('asks for the information and the certificate it requires', async function () {
    const certificateId = await Certificates.insertAsync({ name: { sv: `${prefix}Svets` } });
    const id = await makeEvent({ infoRequired: true, requiredCertificateId: certificateId });
    await rejects(register(id, a, { userId, info: 'Allergi' }), 'certificate-required');
    await Attestations.insertAsync({ certificateId, memberId: a, certifierId: 'x', startDate: new Date(), endDate: inHours(-1) });
    await rejects(register(id, a, { userId, info: 'Allergi' }), 'certificate-required');
    await Attestations.insertAsync({ certificateId, memberId: a, certifierId: 'x', startDate: new Date() });
    await rejects(register(id, a, { userId }), 'info-required');
    assert.strictEqual(await register(id, a, { userId, info: 'Allergi' }), 'approved');
    assert.strictEqual((await EventRegistrations.findOneAsync({ eventId: id, memberId: a })).info, 'Allergi');
    // Board or admin adding someone asks for neither.
    assert.strictEqual(await register(id, b, { userId, override: true }), 'approved');
  });

  it('takes no registrations without registration, when called off, or once started', async function () {
    const none = await makeEvent({ registration: 'none' });
    await rejects(register(none, a, { userId }), 'closed');
    const started = await makeEvent({ start: inHours(-1) });
    await rejects(register(started, a, { userId }), 'closed');
  });

  it('calls off: everyone pending is told, and seats are free', async function () {
    const id = await makeEvent({ maxSeats: 1, queueAllowed: true });
    await register(id, a, { userId });
    await register(id, b, { userId });
    const event = await eventOf(id);
    await updateEvent(id, { name: event.name, start: event.start, durationMinutes: 60, registration: 'required', maxSeats: 1, queueAllowed: true, status: 'cancelled' }, board);
    assert.deepStrictEqual([await stateOf(id, a), await stateOf(id, b)], ['cancelled', 'cancelled']);
    assert.strictEqual((await eventOf(id)).seatsTaken, 0);
    assert.strictEqual(await Messages.find({ member: { $in: [a, b] }, subject: /^Inställt/ }).countAsync(), 2);
  });

  it('is not removed while someone is registered', async function () {
    const id = await makeEvent();
    await register(id, a, { userId });
    await rejects(removeEvent(id, { userId }), 'in-use');
    await withdraw(id, a, { userId });
    await removeEvent(id, { userId });
    assert.strictEqual(await EventRegistrations.find({ eventId: id }).countAsync(), 0);
  });

  it('tells those interested in an activity of a new event', async function () {
    const activityId = await createActivity({ name: { sv: `${prefix}Täljning` }, durationMinutes: 60 }, { userId });
    await setInterest(activityId, d, true);
    await setInterest(activityId, d, true);
    assert.strictEqual(await ActivityInterests.find({ activityId }).countAsync(), 1);
    await createEvent({ activityId, start: inHours(72) }, board);
    assert.strictEqual(await Messages.find({ member: d, subject: /^Nytt tillfälle/ }).countAsync(), 1);
    await setInterest(activityId, d, false);
    assert.strictEqual(await ActivityInterests.find({ activityId }).countAsync(), 0);
  });

  describe('check-in', function () {
    // The day after tomorrow at 18:00; the default window is tomorrow, 03:00 to 15:00.
    const dayAt = (days, hour) => {
      const d = new Date();
      return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days, hour, 0);
    };

    it('opens a window, reminds once, and takes the seats of those who did not', async function () {
      const id = await makeEvent({ start: dayAt(2, 18), maxSeats: 2, queueAllowed: true, checkIn: 'default' });
      await register(id, a, { userId });
      await register(id, b, { userId });
      await register(id, c, { userId });
      assert.strictEqual(await sendCheckInReminders(dayAt(1, 2)), 0);
      assert.strictEqual(await sendCheckInReminders(dayAt(1, 4)), 2);
      assert.strictEqual(await sendCheckInReminders(dayAt(1, 5)), 0);
      await checkIn(id, a, { userId, now: dayAt(1, 5) });
      assert.strictEqual(await stateOf(id, a), 'checkedIn');
      await rejects(checkIn(id, c, { userId, now: dayAt(1, 5) }), 'closed');
      const offered = await Messages.find({ member: c, subject: /^En plats är ledig/ }).countAsync();
      assert.strictEqual(await passCheckInDeadlines(dayAt(1, 14)), 0);
      assert.strictEqual(await passCheckInDeadlines(dayAt(1, 16)), 1);
      assert.strictEqual(await stateOf(id, b), 'missedCheckIn');
      assert.strictEqual((await eventOf(id)).seatsTaken, 1);
      assert.strictEqual(await Messages.find({ member: c, subject: /^En plats är ledig/ }).countAsync(), offered + 1);
      // After the deadline a seat taken comes checked in.
      assert.strictEqual(await takeSeat(id, c, { userId, now: dayAt(1, 16) }), 'checkedIn');
      assert.strictEqual(await passCheckInDeadlines(dayAt(1, 17)), 0);
    });

    it('keeps a custom window, which must open before it closes', async function () {
      const id = await makeEvent({
        start: dayAt(3, 18), checkIn: 'custom', checkInOpensDaysBefore: 2, checkInOpensAt: '8', checkInClosesDaysBefore: 0, checkInClosesAt: '12:00',
      });
      const event = await eventOf(id);
      assert.deepStrictEqual(
        [event.checkIn, event.checkInOpensDaysBefore, event.checkInOpensAt, event.checkInClosesDaysBefore, event.checkInClosesAt],
        ['custom', 2, '08:00', 0, '12:00'],
      );
      await rejects(makeEvent({ checkIn: 'custom', checkInOpensDaysBefore: 1, checkInOpensAt: '15:00', checkInClosesDaysBefore: 1, checkInClosesAt: '03:00' }), 'bad-value');
      await rejects(makeEvent({ checkIn: 'custom', checkInOpensAt: '15:00', checkInClosesAt: '18:00' }), 'bad-value');
      // The default stores no times of its own.
      const plain = await eventOf(await makeEvent({ checkIn: 'default', checkInOpensAt: '01:00' }));
      assert.strictEqual(plain.checkInOpensAt, undefined);
    });
  });

  describe('attendance', function () {
    it('marks who came, and closing makes the rest no-shows', async function () {
      const id = await makeEvent({ start: inHours(1) });
      await register(id, a, { userId });
      await register(id, b, { userId });
      await rejects(markAttended(id, a, true, { userId }), 'closed');
      const later = inHours(2);
      await markAttended(id, a, true, { userId, now: later });
      assert.strictEqual(await stateOf(id, a), 'attended');
      assert.strictEqual(await closeAttendance(id, { userId, now: later }), 1);
      assert.strictEqual(await stateOf(id, b), 'noShow');
      assert.ok((await eventOf(id)).attendanceClosedAt);
      // A no-show can be corrected.
      await markAttended(id, b, true, { userId, now: later });
      assert.strictEqual(await stateOf(id, b), 'attended');
      assert.strictEqual((await eventOf(id)).seatsTaken, 2);
    });
  });
});
