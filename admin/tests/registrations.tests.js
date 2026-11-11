import assert from 'assert';
import { Members } from '/imports/common/collections/members';
import { zonedDayAt } from '/imports/common/lib/days';
import { Activities } from '/imports/common/collections/activities';
import { Events } from '/imports/common/collections/events';
import { EventRegistrations } from '/imports/common/collections/eventRegistrations';
import { ActivityInterests } from '/imports/common/collections/activityInterests';
import { Attestations } from '/imports/common/collections/attestations';
import { Certificates } from '/imports/common/collections/certificates';
import { Messages } from '/imports/common/collections/messages';
import { AuditLog } from '/imports/common/collections/auditLog';
import { MessageTemplates } from '/imports/common/collections/templates';
import { createActivity } from '/imports/common/server/activities/activities';
import { createEvent, updateEvent, removeEvent } from '/imports/common/server/activities/events';
import {
  register, withdraw, takeSeat, checkIn, setInterest, markAttended, closeAttendance,
  sendCheckInReminders, sendCheckInLastCalls, passCheckInDeadlines, sendEventReminders,
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
    // Each message knows its event, for the app to link to.
    assert.strictEqual(await Messages.find({ member: { $in: [a, b] }, type: 'activity', event: id }).countAsync(), 2);
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

  it('lets one who gave up a seat sign up again only after an hour; leaving the queue does not count', async function () {
    const id = await makeEvent({ maxSeats: 1, queueAllowed: true });
    const now = new Date();
    const later = (minutes) => new Date(now.getTime() + minutes * 60000);
    await register(id, a, { userId, now });
    await register(id, b, { userId, now });
    await withdraw(id, a, { userId, now });
    await rejects(register(id, a, { userId, now: later(59) }), 'too-soon');
    assert.strictEqual(await takeSeat(id, b, { userId, now: later(60) }), 'approved');
    assert.strictEqual(await register(id, a, { userId, now: later(61) }), 'queued');
    assert.strictEqual((await EventRegistrations.findOneAsync({ eventId: id, memberId: a })).seatReleasedAt, undefined);
    await withdraw(id, a, { userId, now: later(62) });
    assert.strictEqual(await register(id, a, { userId, now: later(63) }), 'queued');
    // Board or admin adding someone is not held back.
    await withdraw(id, b, { userId, now: later(64) });
    assert.strictEqual(await register(id, b, { userId, now: later(65), override: true }), 'approved');
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

  describe('reminders before the event', function () {
    // Far ahead, so that the other tests' events (a few days out) are not due.
    const base = inHours(1000);
    const at = (hours) => new Date(base.getTime() + hours * HOUR);
    const fields = (start, more = {}) => ({
      name: { sv: `${prefix}Svarvning` }, start, durationMinutes: 60, registration: 'required',
      maxSeats: 2, queueAllowed: true, hostMemberIds: [d], ...more,
    });
    const count = (eventId, member, subject) => Messages.find({ event: eventId, member, subject }).countAsync();

    it('reminds those with a seat and the hosts 24 hours and two hours before, once each', async function () {
      const id = await createEvent(fields(at(30)), board);
      await register(id, a, { userId });
      await register(id, b, { userId });
      await register(id, c, { userId }); // queued
      assert.strictEqual(await sendEventReminders(at(5)), 0, 'not yet 24 hours before');
      assert.strictEqual(await sendEventReminders(at(7)), 3, 'two with a seat and the host');
      assert.strictEqual(await sendEventReminders(at(8)), 0, 'once');
      assert.strictEqual(await count(id, a, /^Påminnelse:/), 1);
      assert.strictEqual(await count(id, c, /^Påminnelse:/), 0, 'not the queue');
      const host = await Messages.findOneAsync({ event: id, member: d, subject: /^Du är värd i morgon/ });
      assert.ok(host.messagetext.includes('Anmälda: 2 av 2'), host.messagetext);
      assert.ok(host.messagetext.includes('I kö: 1'), host.messagetext);
      assert.strictEqual(await sendEventReminders(at(27)), 0, 'not yet two hours before');
      assert.strictEqual(await sendEventReminders(at(29)), 3);
      assert.strictEqual(await sendEventReminders(at(29.5)), 0, 'once');
      assert.strictEqual(await count(id, b, /^Snart:/), 1);
      assert.strictEqual(await count(id, d, /^Du är värd snart/), 1);
    });

    it('leaves the day before to the check-in message where there is check-in', async function () {
      const id = await createEvent(fields(at(130), { checkIn: 'default' }), board);
      await register(id, a, { userId });
      assert.strictEqual(await sendEventReminders(at(107)), 1, 'only the host');
      assert.strictEqual(await count(id, a, /^Påminnelse:/), 0);
      assert.strictEqual(await count(id, d, /^Du är värd i morgon/), 1);
      assert.strictEqual(await sendEventReminders(at(129)), 2, 'two hours before, both');
      assert.strictEqual(await count(id, a, /^Snart:/), 1);
    });

    it('sends only the two-hour reminder for an event put up late, and none for one called off or without hosts', async function () {
      const late = await createEvent(fields(at(201), { hostMemberIds: [] }), board);
      await register(late, a, { userId });
      assert.strictEqual(await sendEventReminders(at(200)), 1, 'one reminder, to the one with a seat; no hosts');
      assert.strictEqual(await count(late, a, /^Påminnelse:/), 0);
      assert.strictEqual(await count(late, a, /^Snart:/), 1);
      const off = await createEvent(fields(at(310)), board);
      await register(off, b, { userId });
      await Events.updateAsync(off, { $set: { status: 'cancelled' } });
      assert.strictEqual(await sendEventReminders(at(300)), 0);
      assert.strictEqual(await sendEventReminders(at(309)), 0);
    });

    it('reminds again for the new time when an event is moved', async function () {
      const id = await createEvent(fields(at(420)), board);
      await register(id, a, { userId });
      assert.strictEqual(await sendEventReminders(at(400)), 2);
      await updateEvent(id, fields(at(450)), board);
      assert.strictEqual((await eventOf(id)).reminderDayBeforeSentAt, undefined);
      assert.strictEqual(await sendEventReminders(at(400)), 0, 'the new time is not 24 hours away');
      assert.strictEqual(await sendEventReminders(at(430)), 2);
      assert.strictEqual(await count(id, a, /^Påminnelse:/), 2);
    });

    it('has a default template for each reminder', async function () {
      for (const type of ['activityReminderDayBefore', 'activityReminderSoon', 'activityHostDayBefore', 'activityHostSoon']) {
        assert.ok(await MessageTemplates.findOneAsync({ type }), type);
      }
    });
  });

  describe('check-in', function () {
    // Days from today at an hour, Swedish time; the default window is the day before, 03:00 to 15:00.
    const dayAt = (days, hour) => zonedDayAt(new Date(), days, `${hour}:00`);

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
      // Two hours before it closes, the one who has not checked in is reminded again, once.
      assert.strictEqual(await sendCheckInLastCalls(dayAt(1, 12)), 0);
      assert.strictEqual(await sendCheckInLastCalls(dayAt(1, 13)), 1);
      assert.strictEqual(await sendCheckInLastCalls(dayAt(1, 14)), 0);
      assert.strictEqual(await Messages.find({ member: b, subject: /^Snart för sent att checka in/ }).countAsync(), 1);
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

    it('reminds again no sooner than an hour after the first reminder', async function () {
      // A window from 16:00 to 17:30 on the day: the last call would be at 15:30.
      const id = await makeEvent({
        start: dayAt(1, 18), checkIn: 'custom', checkInOpensDaysBefore: 0, checkInOpensAt: '16:00', checkInClosesDaysBefore: 0, checkInClosesAt: '17:30',
      });
      await register(id, a, { userId });
      const at = (hour, minutes) => new Date(dayAt(1, hour).getTime() + minutes * 60000);
      assert.strictEqual(await sendCheckInReminders(at(16, 0)), 1);
      assert.strictEqual(await sendCheckInLastCalls(at(16, 30)), 0);
      assert.strictEqual(await sendCheckInLastCalls(at(17, 0)), 1);
      assert.strictEqual(await sendCheckInLastCalls(at(17, 10)), 0);
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
