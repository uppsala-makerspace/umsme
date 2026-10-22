import assert from 'assert';
import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/roles';
import { Certificates } from '/imports/common/collections/certificates';
import { Attestations } from '/imports/common/collections/attestations';
import { Members } from '/imports/common/collections/members';
import { AuditLog } from '/imports/common/collections/auditLog';
import '/server/methods/certificates';

const prefix = 'certtest-';
const board = `${prefix}board`;
const treasurer = `${prefix}treasurer`;
const alice = `${prefix}alice`;
const bob = `${prefix}bob`;

const call = (userId, name, ...args) =>
  Meteor.server.method_handlers[name].apply({ userId, isSimulation: false }, args);

const certificate = (overrides = {}) => ({ name: { sv: `${prefix}Certifikat` }, ...overrides });
const version = async (docId) => (await Certificates.findOneAsync(docId)).updatedAt;

describe('certificates', function () {
  before(async function () {
    await Meteor.users.removeAsync({ _id: { $regex: `^${prefix}` } });
    await Members.removeAsync({ _id: { $regex: `^${prefix}` } });
    for (const [_id, role] of [[board, 'board'], [treasurer, 'treasurer']]) {
      await Roles.createRoleAsync(role, { unlessExists: true });
      await Meteor.users.insertAsync({ _id, emails: [{ address: `${_id}@example.org`, verified: true }] });
      await Roles.addUsersToRolesAsync(_id, role, null);
    }
    await Members.insertAsync({ _id: alice, mid: 'C1', name: 'Alice Certtest', email: `${board}@example.org` });
    await Members.insertAsync({ _id: bob, mid: 'C2', name: 'Bob Certtest', email: `${bob}@example.org` });
  });

  afterEach(async function () {
    const ids = (await Certificates.find({ 'name.sv': { $regex: `^${prefix}` } }).fetchAsync()).map((c) => c._id);
    await Attestations.removeAsync({ certificateId: { $in: ids } });
    await Certificates.removeAsync({ _id: { $in: ids } });
    await AuditLog.removeAsync({ userId: { $regex: `^${prefix}` } });
  });

  after(async function () {
    await Members.removeAsync({ _id: { $regex: `^${prefix}` } });
    await Meteor.roleAssignment.removeAsync({ 'user._id': { $regex: `^${prefix}` } });
    await Meteor.users.removeAsync({ _id: { $regex: `^${prefix}` } });
  });

  it('creates and updates a certificate, logs it, and refuses a stale edit', async function () {
    const docId = await call(board, 'certificates.create', certificate({ description: { sv: ' Om ' }, defaultValidityDays: 30, certifiers: [alice] }));
    const doc = await Certificates.findOneAsync(docId);
    assert.deepStrictEqual(doc.description, { sv: 'Om' });
    assert.deepStrictEqual(doc.certifiers, [alice]);
    assert.strictEqual((await AuditLog.findOneAsync({ docId })).action, 'create');
    const before = doc.updatedAt;
    await call(board, 'certificates.update', docId, certificate({ test: { testId: 'safety', maxAttempts: 3, maxErrors: 1 } }), before);
    const updated = await Certificates.findOneAsync(docId);
    assert.strictEqual('defaultValidityDays' in updated, false);
    assert.deepStrictEqual(updated.test, { testId: 'safety', maxAttempts: 3, maxErrors: 1 });
    await assert.rejects(call(board, 'certificates.update', docId, certificate(), before), /conflict/);
  });

  it('refuses the treasurer', async function () {
    await assert.rejects(call(treasurer, 'certificates.create', certificate()), /not-authorized/);
  });

  it('keeps prerequisites free of cycles', async function () {
    const first = await call(board, 'certificates.create', certificate());
    const second = await call(board, 'certificates.create', certificate({ prerequisites: [first] }));
    await assert.rejects(call(board, 'certificates.update', first, certificate({ prerequisites: [second] }), await version(first)), /prerequisite-cycle/);
    await assert.rejects(call(board, 'certificates.update', first, certificate({ prerequisites: [first] }), await version(first)), /prerequisite-cycle/);
  });

  it('has one mandatory certificate, which stays', async function () {
    if (await Certificates.findOneAsync({ mandatory: true, 'name.sv': { $not: { $regex: `^${prefix}` } } })) this.skip();
    const first = await call(board, 'certificates.create', certificate());
    const second = await call(board, 'certificates.create', certificate());
    await call(board, 'certificates.markMandatory', first);
    await assert.rejects(call(board, 'certificates.markMandatory', second), /mandatory-exists/);
    await assert.rejects(call(board, 'certificates.remove', first), /mandatory/);
  });

  it('removes a certificate and its place as a prerequisite', async function () {
    const first = await call(board, 'certificates.create', certificate());
    const second = await call(board, 'certificates.create', certificate({ prerequisites: [first] }));
    await call(board, 'certificates.remove', first);
    assert.strictEqual(await Certificates.findOneAsync(first), undefined);
    assert.deepStrictEqual((await Certificates.findOneAsync(second)).prerequisites, []);
  });

  it('refuses to remove a certificate somebody holds', async function () {
    const docId = await call(board, 'certificates.create', certificate());
    await call(board, 'certificates.grant', { certificateId: docId, memberId: bob, certifierId: alice, startDate: new Date(), endDate: null, comment: null });
    await assert.rejects(call(board, 'certificates.remove', docId), /has-holders/);
    assert.ok(await Certificates.findOneAsync(docId));
  });

  it('grants with the default validity, confirmed, and revokes', async function () {
    const docId = await call(board, 'certificates.create', certificate({ defaultValidityDays: 10 }));
    const startDate = new Date(Date.UTC(2026, 0, 1));
    const attestationId = await call(board, 'certificates.grant', { certificateId: docId, memberId: bob, certifierId: alice, startDate, endDate: null, comment: null });
    const attestation = await Attestations.findOneAsync(attestationId);
    assert.strictEqual(attestation.endDate.toISOString(), new Date(Date.UTC(2026, 0, 11)).toISOString());
    assert.ok(attestation.confirmedAt);
    const [holder] = await call(board, 'certificates.holders', docId);
    assert.deepStrictEqual([holder.memberName, holder.certifierName, holder.pending], ['Bob Certtest', 'Alice Certtest', false]);
    assert.strictEqual((await call(board, 'certificates.ofMember', bob)).find((a) => a._id === attestationId).certificateName, `${prefix}Certifikat`);
    await call(board, 'certificates.revoke', attestationId);
    assert.strictEqual(await Attestations.findOneAsync(attestationId), undefined);
  });

  it('certifies as the logged-in member by default', async function () {
    assert.strictEqual((await call(board, 'certificates.defaultCertifier'))._id, alice);
  });
});
