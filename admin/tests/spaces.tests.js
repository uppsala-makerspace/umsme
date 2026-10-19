import assert from 'assert';
import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/roles';
import { Spaces } from '/imports/common/collections/spaces';
import { Workshops } from '/imports/common/collections/workshops';
import { AuditLog } from '/imports/common/collections/auditLog';
import '/server/methods/spaces';
import registerPublications from '/server/publications';

const prefix = 'sptest-';
const board = `${prefix}board`;
const treasurer = `${prefix}treasurer`;

const call = (userId, name, ...args) =>
  Meteor.server.method_handlers[name].apply({ userId, isSimulation: false }, args);

const published = async (name, userId, ...args) => {
  const sub = { userId, ready() {}, added() {}, changed() {}, removed() {}, onStop() {}, error(e) { throw e; } };
  const cursor = await Meteor.server.publish_handlers[name].call(sub, ...args);
  return cursor ? cursor.fetchAsync() : [];
};

let keys = 0;
const fields = (overrides = {}) => ({
  spaceId: `${prefix}${(keys += 1)}`,
  floor: 'floor1',
  name: { sv: `${prefix}Rum`, en: 'Room' },
  slackChannels: [' #a ', '', '#b'],
  ...overrides,
});

const cleanup = async () => {
  await Workshops.removeAsync({ _id: { $regex: `^${prefix}` } });
  await Spaces.removeAsync({ spaceId: { $regex: `^${prefix}` } });
  await AuditLog.removeAsync({ userId: { $regex: `^${prefix}` } });
};

describe('spaces', function () {
  before(async function () {
    if (!Meteor.server.publish_handlers['admin.spaces.list']) registerPublications();
    await Meteor.roleAssignment.removeAsync({ 'user._id': { $regex: `^${prefix}` } });
    await Meteor.users.removeAsync({ _id: { $regex: `^${prefix}` } });
    for (const [_id, role] of [[board, 'board'], [treasurer, 'treasurer']]) {
      await Roles.createRoleAsync(role, { unlessExists: true });
      await Meteor.users.insertAsync({ _id, emails: [{ address: `${_id}@example.org` }] });
      await Roles.addUsersToRolesAsync(_id, role, null);
    }
  });

  after(async function () {
    await cleanup();
    await Meteor.roleAssignment.removeAsync({ 'user._id': { $regex: `^${prefix}` } });
    await Meteor.users.removeAsync({ _id: { $regex: `^${prefix}` } });
  });

  afterEach(cleanup);

  it('creates a space with trimmed Slack channels, and logs it', async function () {
    const docId = await call(board, 'spaces.create', fields());
    const doc = await Spaces.findOneAsync(docId);
    assert.deepStrictEqual(doc.slackChannels, ['#a', '#b']);
    assert.ok(doc.updatedAt instanceof Date);
    assert.strictEqual((await AuditLog.findOneAsync({ docId })).action, 'create');
  });

  it('allows the same map key on the other floor, not on the same one', async function () {
    await call(board, 'spaces.create', fields({ spaceId: `${prefix}kitchen`, floor: 'floor1' }));
    await call(board, 'spaces.create', fields({ spaceId: `${prefix}kitchen`, floor: 'floor2' }));
    await assert.rejects(call(board, 'spaces.create', fields({ spaceId: `${prefix}kitchen`, floor: 'floor1' })), /duplicate-space/);
  });

  it('refuses an unknown floor and the treasurer', async function () {
    await assert.rejects(call(board, 'spaces.create', fields({ floor: 'floor3' })), /bad-floor/);
    await assert.rejects(call(treasurer, 'spaces.create', fields()), /not-authorized/);
  });

  it('updates a space, clearing emptied fields, and refuses a stale edit', async function () {
    const docId = await call(board, 'spaces.create', fields({ iconSize: 32 }));
    const { updatedAt, spaceId } = await Spaces.findOneAsync(docId);
    const next = fields({ spaceId, slackChannels: [], iconSize: null, description: { sv: 'Text' } });
    await call(board, 'spaces.update', docId, next, updatedAt);
    const doc = await Spaces.findOneAsync(docId);
    assert.strictEqual('slackChannels' in doc, false);
    assert.strictEqual('iconSize' in doc, false);
    assert.deepStrictEqual(doc.description, { sv: 'Text' });
    await assert.rejects(call(board, 'spaces.update', docId, next, updatedAt), /conflict/);
  });

  it('lists what links to a space, and keeps a linked space', async function () {
    const docId = await call(board, 'spaces.create', fields());
    await Workshops.insertAsync({ _id: `${prefix}w`, name: { sv: 'Verkstad' }, kind: 'workshop', status: 'established', secondarySpaceIds: [docId] });
    const links = await call(board, 'spaces.links', docId);
    assert.deepStrictEqual(links.workshops.map((w) => [w._id, w.isPrimary]), [[`${prefix}w`, false]]);
    await assert.rejects(call(board, 'spaces.remove', docId), /linked/);
  });

  it('removes a free space, but not one with an icon', async function () {
    const free = await call(board, 'spaces.create', fields());
    await call(board, 'spaces.remove', free);
    assert.strictEqual(await Spaces.findOneAsync(free), undefined);
    const pictured = await call(board, 'spaces.create', fields());
    await Spaces.updateAsync(pictured, { $set: { iconFileId: 'x.svg', iconMimeType: 'image/svg+xml' } });
    await assert.rejects(call(board, 'spaces.remove', pictured), /has-icon/);
  });

  it('gives the list no descriptions, and the treasurer nothing', async function () {
    await call(board, 'spaces.create', fields({ description: { sv: 'Lång' } }));
    const [doc] = (await published('admin.spaces.list', board)).filter((d) => d.spaceId?.startsWith(prefix));
    assert.strictEqual('description' in doc, false);
    assert.deepStrictEqual(await published('admin.spaces.list', treasurer), []);
  });
});
