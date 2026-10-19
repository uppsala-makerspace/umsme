import assert from 'assert';
import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/roles';
import registerPublications from '/server/publications';

const prefix = 'pubtest-';

// Runs a publication the way a subscription does and collects what it sends.
const published = async (name, userId) => {
  const sent = [];
  const sub = {
    userId,
    ready() {},
    added(collection, id, fields) { sent.push({ collection, id, fields }); },
    changed() {}, removed() {}, onStop() {}, error(e) { throw e; },
  };
  const result = await Meteor.server.publish_handlers[name].call(sub);
  const cursors = Array.isArray(result) ? result : result ? [result] : [];
  for (const cursor of cursors) {
    const collection = cursor._cursorDescription.collectionName;
    for (const doc of await cursor.fetchAsync()) {
      const { _id, ...fields } = doc;
      sent.push({ collection, id: _id, fields });
    }
  }
  return sent.filter((s) => s.collection === 'users' && String(s.id).startsWith(prefix));
};

describe('user publications', function () {
  const board = `${prefix}board`;
  const storage = `${prefix}storage`;
  const other = `${prefix}other`;

  before(async function () {
    if (!Meteor.server.publish_handlers.users) registerPublications();
    await Meteor.roleAssignment.removeAsync({ 'user._id': { $regex: `^${prefix}` } });
    await Meteor.users.removeAsync({ _id: { $regex: `^${prefix}` } });
    for (const role of ['board', 'storage']) await Roles.createRoleAsync(role, { unlessExists: true });
    for (const _id of [board, storage]) await Meteor.users.insertAsync({ _id, emails: [{ address: `${_id}@example.com` }] });
    await Meteor.users.insertAsync({
      _id: other,
      username: 'other',
      emails: [{ address: 'other@example.com', verified: true }],
      profile: { name: 'Other Person', pnr: '199001011234' },
      services: {
        password: { bcrypt: 'hash' },
        resume: { loginTokens: [{ hashedToken: 'token' }] },
        google: { accessToken: 'secret', idToken: 'secret' },
      },
    });
    await Roles.addUsersToRolesAsync(board, 'board', null);
    await Roles.addUsersToRolesAsync(storage, 'storage', null);
  });

  after(async function () {
    await Meteor.roleAssignment.removeAsync({ 'user._id': { $regex: `^${prefix}` } });
    await Meteor.users.removeAsync({ _id: { $regex: `^${prefix}` } });
  });

  it('gives the board accounts without services or profile', async function () {
    const doc = (await published('users', board)).find((s) => s.id === other);
    assert.ok(doc);
    assert.strictEqual(doc.fields.services, undefined);
    assert.strictEqual(doc.fields.profile, undefined);
    assert.strictEqual(doc.fields.emails[0].address, 'other@example.com');
  });

  it('gives storage operators an email and a name, nothing more', async function () {
    const doc = (await published('storageAdminDashboard', storage)).find((s) => s.id === other);
    assert.ok(doc);
    assert.strictEqual(doc.fields.services, undefined);
    assert.deepStrictEqual(doc.fields.profile, { name: 'Other Person' });
  });

  it('gives a member without a role nothing', async function () {
    const plain = `${prefix}plain`;
    await Meteor.users.insertAsync({ _id: plain });
    assert.deepStrictEqual(await published('users', plain), []);
  });
});
