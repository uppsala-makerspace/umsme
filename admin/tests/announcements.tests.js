import assert from 'assert';
import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/roles';
import { Announcements } from '/imports/common/collections/announcements';
import { Mails } from '/imports/common/collections/mails';
import { AuditLog } from '/imports/common/collections/auditLog';
import '/server/methods/announcements';

const prefix = 'anntest-';
const board = `${prefix}board`;
const treasurer = `${prefix}treasurer`;

const call = (userId, name, ...args) =>
  Meteor.server.method_handlers[name].apply({ userId, isSimulation: false }, args);

const announcement = (overrides = {}) => ({ type: 'information', subjectSv: `${prefix}Ämne`, bodySv: 'Text', ...overrides });

describe('announcements', function () {
  before(async function () {
    for (const [_id, role] of [[board, 'board'], [treasurer, 'treasurer']]) {
      await Meteor.users.removeAsync(_id);
      await Roles.createRoleAsync(role, { unlessExists: true });
      await Meteor.users.insertAsync({ _id, emails: [{ address: `${_id}@example.org` }] });
      await Roles.addUsersToRolesAsync(_id, role, null);
    }
  });

  afterEach(async function () {
    await Announcements.removeAsync({ subjectSv: { $regex: `^${prefix}` } });
    await Mails.removeAsync({ subject: { $regex: `^${prefix}` } });
    await AuditLog.removeAsync({ userId: { $regex: `^${prefix}` } });
  });

  after(async function () {
    await Meteor.roleAssignment.removeAsync({ 'user._id': { $regex: `^${prefix}` } });
    await Meteor.users.removeAsync({ _id: { $regex: `^${prefix}` } });
  });

  it('writes a draft, edits it, and refuses a stale edit', async function () {
    const docId = await call(board, 'announcements.create', announcement({ subjectEn: ' Subject ' }));
    const doc = await Announcements.findOneAsync(docId);
    assert.strictEqual(doc.status, 'draft');
    assert.strictEqual(doc.subjectEn, 'Subject');
    await call(board, 'announcements.update', docId, announcement({ subjectEn: '' }), doc.updatedAt);
    assert.strictEqual('subjectEn' in (await Announcements.findOneAsync(docId)), false);
    await assert.rejects(call(board, 'announcements.update', docId, announcement(), doc.updatedAt), /conflict/);
    assert.strictEqual((await AuditLog.find({ docId }).countAsync()), 2);
  });

  it('refuses the treasurer, an unknown type and an empty text', async function () {
    await assert.rejects(call(treasurer, 'announcements.create', announcement()), /not-authorized/);
    await assert.rejects(call(board, 'announcements.create', announcement({ type: 'spam' })), /bad-type/);
    await assert.rejects(call(board, 'announcements.create', announcement({ bodySv: ' ' })), /bad-text/);
  });

  it('removes an announcement with the record of its mail', async function () {
    const mailId = await Mails.insertAsync({ from: 'a@example.org', recipients: 'members', family: true, to: ['a@example.org'], subject: `${prefix}Mail`, template: 'x', senddate: new Date() });
    const docId = await Announcements.insertAsync({ ...announcement(), status: 'sent', createdAt: new Date(), mailId });
    await call(board, 'announcements.remove', docId);
    assert.strictEqual(await Announcements.findOneAsync(docId), undefined);
    assert.strictEqual(await Mails.findOneAsync(mailId), undefined);
  });
});
