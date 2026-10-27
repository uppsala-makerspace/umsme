import assert from 'assert';
import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/roles';
import { Events } from '/imports/common/collections/events';
import { EventRegistrations } from '/imports/common/collections/eventRegistrations';
import { Certificates } from '/imports/common/collections/certificates';
import { Attestations } from '/imports/common/collections/attestations';
import { Members } from '/imports/common/collections/members';
import { AuditLog } from '/imports/common/collections/auditLog';
import { grantsOnAttendance } from '/imports/common/lib/activityRules';
import { canCertify } from '/imports/common/server/certificates/canCertify';
import { createEvent, updateEvent, currentEvent } from '/imports/common/server/activities/events';
import { register, markAttended } from '/imports/common/server/activities/registrations';
import { setActivityTransportsForTests } from '/imports/common/server/activities/notify';

// Stage 5: the certificate an event gives, on attendance through a host who
// may certify it, or by a host in the certificate's own flow.

const prefix = 'targettest-';
const userId = `${prefix}user`;
const board = { userId, isAdminish: true };
const [host, other, p1, p2, roleHolder] = ['host', 'other', 'p1', 'p2', 'role'].map((k) => `${prefix}${k}`);
const members = [host, other, p1, p2, roleHolder];
const HOUR = 3600000;
const inHours = (n) => new Date(Date.now() + n * HOUR);
const DAY = 86400000;

const rejects = (promise, error) => assert.rejects(promise, (e) => e.error === error);
const attestationsOf = (memberId, certificateId) => Attestations.find({ memberId, certificateId }, { sort: { startDate: 1 } }).fetchAsync();

const cleanup = async () => {
  const events = (await Events.find({ createdBy: userId }).fetchAsync()).map((e) => e._id);
  await EventRegistrations.removeAsync({ eventId: { $in: events } });
  await Events.removeAsync({ createdBy: userId });
  await Attestations.removeAsync({ memberId: { $in: members } });
  await Certificates.removeAsync({ 'name.sv': { $regex: `^${prefix}` } });
  await Members.removeAsync({ _id: { $in: members } });
  await Meteor.users.removeAsync({ _id: { $regex: `^${prefix}` } });
  await AuditLog.removeAsync({ userId });
};

describe('certificates events give', function () {
  let basics;
  let glazing;

  before(async function () {
    await cleanup();
    setActivityTransportsForTests({ sendEmail: async () => {}, sendPush: async () => {} });
    for (const [i, _id] of members.entries()) {
      await Members.insertAsync({ _id, mid: `T${i}`, name: `Target ${i}`, email: `${_id}@example.org` });
    }
    await Roles.createRoleAsync(`${prefix}glazers`, { unlessExists: true });
    await Meteor.users.insertAsync({ _id: `${prefix}roleuser`, emails: [{ address: `${roleHolder}@example.org`, verified: true }] });
    await Roles.addUsersToRolesAsync(`${prefix}roleuser`, `${prefix}glazers`, null);
    basics = await Certificates.insertAsync({ name: { sv: `${prefix}Grunder` } });
    glazing = await Certificates.insertAsync({
      name: { sv: `${prefix}Glasering` }, certifiers: [host], certifierRole: `${prefix}glazers`, defaultValidityDays: 365,
    });
  });

  after(async function () {
    setActivityTransportsForTests(null);
    await cleanup();
  });

  // Each test's participants start without certificates.
  afterEach(async function () {
    await Attestations.removeAsync({ memberId: { $in: members } });
  });

  // A started event giving glazing, hosted by `hosts`, with p1 and p2 signed up.
  const startedEvent = async ({ grant = 'onAttendance', hosts = [host, other], certificateId = glazing } = {}) => {
    const id = await createEvent({
      name: { sv: `${prefix}Kurs` }, start: inHours(48), durationMinutes: 60, registration: 'required',
      targetCertificateId: certificateId, certificateGrant: grant, hostMemberIds: hosts,
    }, board);
    await register(id, p1, { userId });
    await register(id, p2, { userId });
    return id;
  };
  const later = inHours(49);

  it('says who may certify: a named certifier, or one with the role', async function () {
    const certificate = await Certificates.findOneAsync(glazing);
    assert.strictEqual(await canCertify(host, certificate), true);
    assert.strictEqual(await canCertify(roleHolder, certificate), true);
    assert.strictEqual(await canCertify(other, certificate), false);
    assert.strictEqual(await canCertify(null, certificate), false);
  });

  it('gives the certificate on attendance through a host who may certify it, and only then', async function () {
    const id = await startedEvent();
    assert.strictEqual(grantsOnAttendance(await currentEvent(id)), true);
    assert.deepStrictEqual(await markAttended(id, p1, true, { userId, certifierMemberId: other, now: later }), { certificate: 'not-certifier' });
    assert.strictEqual((await attestationsOf(p1, glazing)).length, 0);

    assert.deepStrictEqual(await markAttended(id, p2, true, { userId, certifierMemberId: host, now: later }), { certificate: 'granted' });
    const [given] = await attestationsOf(p2, glazing);
    assert.strictEqual(given.certifierId, host);
    assert.ok(given.confirmedAt);
    assert.strictEqual(Math.round((given.endDate - given.startDate) / DAY), 365);

    // Taken back, the attendance leaves the certificate.
    assert.deepStrictEqual(await markAttended(id, p2, false, { userId, certifierMemberId: host, now: later }), { certificate: null });
    assert.strictEqual((await attestationsOf(p2, glazing)).length, 1);
  });

  it('confirms a pending request, and gives one who holds it a new one from now', async function () {
    const id = await startedEvent();
    const requested = await Attestations.insertAsync({ certificateId: glazing, memberId: p1, startDate: inHours(-24), attempt: 1 });
    await markAttended(id, p1, true, { userId, certifierMemberId: host, now: later });
    const [confirmed] = await attestationsOf(p1, glazing);
    assert.strictEqual(confirmed._id, requested);
    assert.strictEqual(confirmed.certifierId, host);

    // p2 holds it, running out soon: attending gives a new one, so for longer.
    await Attestations.insertAsync({ certificateId: glazing, memberId: p2, certifierId: host, startDate: inHours(-24 * 300), endDate: inHours(24 * 10), confirmedAt: inHours(-24 * 300) });
    await markAttended(id, p2, true, { userId, certifierMemberId: host, now: later });
    const held = await attestationsOf(p2, glazing);
    assert.strictEqual(held.length, 2);
    assert.ok(held[1].endDate > inHours(24 * 300));
  });

  it('gives it not to one without its prerequisites', async function () {
    const advanced = await Certificates.insertAsync({ name: { sv: `${prefix}Avancerad` }, certifiers: [host], prerequisites: [basics] });
    const id = await startedEvent({ certificateId: advanced });
    assert.deepStrictEqual(await markAttended(id, p1, true, { userId, certifierMemberId: host, now: later }), { certificate: 'missing-prerequisites' });
    assert.strictEqual((await attestationsOf(p1, advanced)).length, 0);
    await Attestations.insertAsync({ certificateId: basics, memberId: p2, certifierId: host, startDate: inHours(-24), confirmedAt: inHours(-24) });
    assert.deepStrictEqual(await markAttended(id, p2, true, { userId, certifierMemberId: host, now: later }), { certificate: 'granted' });
  });

  it('gives nothing on attendance when given by a host by hand', async function () {
    const id = await startedEvent({ grant: 'manual' });
    assert.deepStrictEqual(await markAttended(id, p1, true, { userId, certifierMemberId: host, now: later }), { certificate: null });
    assert.strictEqual((await attestationsOf(p1, glazing)).length, 0);
  });

  it('asks that one of its hosts may certify it, when the hosts are set', async function () {
    await rejects(startedEvent({ hosts: [other] }), 'no-certifier-host');
    // By hand, any host will do; and without hosts it waits for one.
    await startedEvent({ grant: 'manual', hosts: [other] });
    const id = await createEvent({
      name: { sv: `${prefix}Kurs` }, start: inHours(48), durationMinutes: 60, targetCertificateId: glazing, certificateGrant: 'onAttendance',
    }, board);
    const event = await currentEvent(id);
    await rejects(updateEvent(id, { name: event.name, start: event.start, end: event.end, targetCertificateId: glazing, certificateGrant: 'onAttendance', hostMemberIds: [other] }, board), 'no-certifier-host');
    await updateEvent(id, { name: event.name, start: event.start, end: event.end, targetCertificateId: glazing, certificateGrant: 'onAttendance', hostMemberIds: [other, roleHolder] }, board);
  });

  it('keeps the way it is given only with a certificate to give', async function () {
    const id = await createEvent({ name: { sv: `${prefix}Kurs` }, start: inHours(48), durationMinutes: 60, targetCertificateId: glazing }, board);
    const event = await currentEvent(id);
    assert.strictEqual(event.targetCertificateId, glazing);
    await rejects(createEvent({ name: { sv: `${prefix}Kurs` }, start: inHours(48), durationMinutes: 60, targetCertificateId: glazing, certificateGrant: 'often' }, board), 'bad-value');
  });
});
