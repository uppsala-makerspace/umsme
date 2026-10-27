import assert from 'assert';
import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/roles';
import { Events } from '/imports/common/collections/events';
import { EventRegistrations } from '/imports/common/collections/eventRegistrations';
import { Certificates } from '/imports/common/collections/certificates';
import { Attestations } from '/imports/common/collections/attestations';
import { Members } from '/imports/common/collections/members';
import { AuditLog } from '/imports/common/collections/auditLog';
import { canCertify } from '/imports/common/server/certificates/canCertify';
import { createEvent } from '/imports/common/server/activities/events';
import {
  register, markAttended, closeAttendance, addAttendee, certificateRequestFor,
} from '/imports/common/server/activities/registrations';
import { setActivityTransportsForTests } from '/imports/common/server/activities/notify';

// Stage 5: the certificate an event gives, certified by a host who may to one
// who came, through a request; and adding one who came without a seat.

const prefix = 'targettest-';
const userId = `${prefix}user`;
const board = { userId, isAdminish: true };
const [host, other, p1, p2, roleHolder] = ['host', 'other', 'p1', 'p2', 'role'].map((k) => `${prefix}${k}`);
const members = [host, other, p1, p2, roleHolder];
const HOUR = 3600000;
const inHours = (n) => new Date(Date.now() + n * HOUR);

const rejects = (promise, error) => assert.rejects(promise, (e) => e.error === error);
const attestationsOf = (memberId, certificateId) => Attestations.find({ memberId, certificateId }, { sort: { startDate: 1 } }).fetchAsync();
const stateOf = async (eventId, memberId) => (await EventRegistrations.findOneAsync({ eventId, memberId }))?.state;

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

  // An event giving `certificateId` (glazing), starting in two days, with p1 and p2 signed up.
  const makeEvent = async ({ certificateId = glazing, registration = 'required', hosts = [host, other] } = {}) => {
    const id = await createEvent({
      name: { sv: `${prefix}Kurs` }, start: inHours(48), durationMinutes: 60, registration,
      targetCertificateId: certificateId, hostMemberIds: hosts,
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

  it('gives no certificate for coming; a host who may certify gets a request to certify one who came by', async function () {
    const id = await makeEvent();
    await markAttended(id, p1, true, { userId, now: later });
    assert.strictEqual((await attestationsOf(p1, glazing)).length, 0);

    await rejects(certificateRequestFor(id, p1, { userId, certifierMemberId: other, now: later }), 'not-certifier');
    await rejects(certificateRequestFor(id, p2, { userId, certifierMemberId: host, now: later }), 'bad-state');
    const requestId = await certificateRequestFor(id, p1, { userId, certifierMemberId: host, now: later });
    const [made] = await attestationsOf(p1, glazing);
    assert.strictEqual(made._id, requestId);
    // A request, pending: the certifier confirms it, or comments, on its page.
    assert.strictEqual(made.certifierId, undefined);
    // Asked again, it is the same request.
    assert.strictEqual(await certificateRequestFor(id, p1, { userId, certifierMemberId: roleHolder, now: later }), requestId);
    assert.strictEqual((await attestationsOf(p1, glazing)).length, 1);
  });

  it('uses the request one has made already', async function () {
    const id = await makeEvent();
    const requested = await Attestations.insertAsync({ certificateId: glazing, memberId: p1, startDate: inHours(-24), attempt: 1 });
    await markAttended(id, p1, true, { userId, now: later });
    assert.strictEqual(await certificateRequestFor(id, p1, { userId, certifierMemberId: host, now: later }), requested);
  });

  it('makes no request for one without its prerequisites', async function () {
    const advanced = await Certificates.insertAsync({ name: { sv: `${prefix}Avancerad` }, certifiers: [host], prerequisites: [basics] });
    const id = await makeEvent({ certificateId: advanced });
    await markAttended(id, p1, true, { userId, now: later });
    await rejects(certificateRequestFor(id, p1, { userId, certifierMemberId: host, now: later }), 'missing-prerequisites');
    assert.strictEqual((await attestationsOf(p1, advanced)).length, 0);
  });

  it('takes hosts none of whom may certify it', async function () {
    await makeEvent({ hosts: [other] });
  });

  it('adds one who came without a seat as come, while the attendance is recorded', async function () {
    const id = await makeEvent({ registration: 'optional' });
    await rejects(addAttendee(id, roleHolder, { userId, now: inHours(1) }), 'closed');
    await addAttendee(id, roleHolder, { userId, now: later });
    assert.strictEqual(await stateOf(id, roleHolder), 'attended');
    assert.strictEqual((await Events.findOneAsync(id)).seatsTaken, 3);
    await rejects(addAttendee(id, roleHolder, { userId, now: later }), 'registered');
    // One with a seat is marked as come.
    await addAttendee(id, p1, { userId, now: later });
    assert.strictEqual(await stateOf(id, p1), 'attended');
    assert.strictEqual((await Events.findOneAsync(id)).seatsTaken, 3);
    // The one added may be certified.
    assert.ok(await certificateRequestFor(id, roleHolder, { userId, certifierMemberId: host, now: later }));
    await closeAttendance(id, { userId, now: later });
    await rejects(addAttendee(id, other, { userId, now: later }), 'closed');
  });

  it('adds nobody to an event without registration', async function () {
    const id = await createEvent({ name: { sv: `${prefix}Kurs` }, start: inHours(48), durationMinutes: 60, registration: 'none' }, board);
    await rejects(addAttendee(id, p1, { userId, now: later }), 'closed');
  });
});
