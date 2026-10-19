import assert from 'assert';
import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/roles';
import { LiabilityDocuments } from '/imports/common/collections/liabilityDocuments';
import { AuditLog } from '/imports/common/collections/auditLog';
import { changedFields } from '/imports/common/server/auditLog';
import '/server/methods/liability';
import registerPublications from '/server/publications';

const prefix = 'liabtest-';
const board = `${prefix}board`;
const treasurer = `${prefix}treasurer`;

// Calls a method the way a DDP client does, as the given user.
const call = (userId, name, ...args) =>
  Meteor.server.method_handlers[name].apply({ userId, isSimulation: false }, args);

// Runs a publication the way a subscription does and returns its documents.
const published = async (name, userId, ...args) => {
  const sub = { userId, ready() {}, added() {}, changed() {}, removed() {}, onStop() {}, error(e) { throw e; } };
  const cursor = await Meteor.server.publish_handlers[name].call(sub, ...args);
  return cursor ? cursor.fetchAsync() : [];
};

const fields = (overrides = {}) => ({
  title: `${prefix}Version`,
  date: new Date(Date.UTC(2021, 2, 15)),
  text: { sv: 'Svensk text', en: 'English text' },
  ...overrides,
});

const cleanup = async () => {
  const ids = (await LiabilityDocuments.find({ title: { $regex: `^${prefix}` } }).fetchAsync()).map((d) => d._id);
  await LiabilityDocuments.removeAsync({ _id: { $in: ids } });
  await AuditLog.removeAsync({ userId: { $regex: `^${prefix}` } });
};

describe('liability documents', function () {
  before(async function () {
    if (!Meteor.server.publish_handlers['admin.liability.list']) registerPublications();
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

  describe('changedFields', function () {
    it('lists only what differs, with old and new values', function () {
      assert.deepStrictEqual(
        changedFields({ _id: 'x', title: 'A', date: 1, updatedAt: 1 }, { _id: 'x', title: 'B', date: 1, updatedAt: 2 }),
        { title: { from: 'A', to: 'B' } },
      );
    });

    it('compares nested values as a whole', function () {
      assert.deepStrictEqual(
        changedFields({ text: { sv: 'a', en: 'b' } }, { text: { sv: 'a', en: 'c' } }),
        { text: { from: { sv: 'a', en: 'b' }, to: { sv: 'a', en: 'c' } } },
      );
    });

    it('records every field of a created or removed document', function () {
      assert.deepStrictEqual(changedFields(null, { title: 'A' }), { title: { from: null, to: 'A' } });
      assert.deepStrictEqual(changedFields({ title: 'A' }, null), { title: { from: 'A', to: null } });
    });
  });

  describe('create', function () {
    it('creates a version and logs who did it', async function () {
      const docId = await call(board, 'liability.create', fields({ title: `  ${prefix}Trimmed  ` }));
      const doc = await LiabilityDocuments.findOneAsync(docId);
      assert.strictEqual(doc.title, `${prefix}Trimmed`);
      assert.deepStrictEqual(doc.text, { sv: 'Svensk text', en: 'English text' });
      assert.ok(doc.updatedAt instanceof Date);

      const entry = await AuditLog.findOneAsync({ docId });
      assert.strictEqual(entry.userId, board);
      assert.strictEqual(entry.domain, 'liability');
      assert.strictEqual(entry.action, 'create');
      assert.strictEqual(entry.changes.title.to, `${prefix}Trimmed`);
    });

    it('refuses the treasurer and anyone not logged in', async function () {
      await assert.rejects(call(treasurer, 'liability.create', fields()), /not-authorized/);
      await assert.rejects(call(null, 'liability.create', fields()), /not-authorized/);
      assert.strictEqual(await LiabilityDocuments.find({ title: { $regex: `^${prefix}` } }).countAsync(), 0);
    });

    it('refuses a version without a title or date', async function () {
      await assert.rejects(call(board, 'liability.create', fields({ title: undefined })), /Match/);
      await assert.rejects(call(board, 'liability.create', fields({ date: '2021-03-15' })), /Match/);
    });

    it('refuses an empty title', async function () {
      await assert.rejects(call(board, 'liability.create', fields({ title: '   ' })), /required/i);
    });
  });

  describe('update', function () {
    it('changes a version and logs only what changed', async function () {
      const docId = await call(board, 'liability.create', fields());
      const { updatedAt } = await LiabilityDocuments.findOneAsync(docId);
      await call(board, 'liability.update', docId, fields({ title: `${prefix}Renamed` }), updatedAt);

      assert.strictEqual((await LiabilityDocuments.findOneAsync(docId)).title, `${prefix}Renamed`);
      const entry = await AuditLog.findOneAsync({ docId, action: 'update' });
      assert.deepStrictEqual(entry.changes, { title: { from: `${prefix}Version`, to: `${prefix}Renamed` } });
    });

    it('refuses to overwrite a change made since the editor loaded the version', async function () {
      const docId = await call(board, 'liability.create', fields());
      const { updatedAt: loaded } = await LiabilityDocuments.findOneAsync(docId);
      await call(board, 'liability.update', docId, fields({ title: `${prefix}First` }), loaded);
      await assert.rejects(
        call(board, 'liability.update', docId, fields({ title: `${prefix}Second` }), loaded),
        /conflict/,
      );
      assert.strictEqual((await LiabilityDocuments.findOneAsync(docId)).title, `${prefix}First`);
    });

    it('accepts an update of a version written before updatedAt existed', async function () {
      const docId = await LiabilityDocuments.insertAsync({ title: `${prefix}Old`, date: new Date(), text: { sv: 'x' } });
      await call(board, 'liability.update', docId, fields({ title: `${prefix}Old edited` }), null);
      assert.strictEqual((await LiabilityDocuments.findOneAsync(docId)).title, `${prefix}Old edited`);
    });

    it('refuses the treasurer', async function () {
      const docId = await call(board, 'liability.create', fields());
      await assert.rejects(call(treasurer, 'liability.update', docId, fields({ title: `${prefix}X` }), null), /not-authorized/);
    });
  });

  describe('remove', function () {
    it('removes a version and logs what it was', async function () {
      const docId = await call(board, 'liability.create', fields());
      await call(board, 'liability.remove', docId);
      assert.strictEqual(await LiabilityDocuments.findOneAsync(docId), undefined);
      const entry = await AuditLog.findOneAsync({ docId, action: 'remove' });
      assert.strictEqual(entry.changes.title.from, `${prefix}Version`);
    });

    it('refuses the treasurer and an unknown document', async function () {
      const docId = await call(board, 'liability.create', fields());
      await assert.rejects(call(treasurer, 'liability.remove', docId), /not-authorized/);
      await assert.rejects(call(board, 'liability.remove', `${prefix}missing`), /not-found/);
    });
  });

  describe('publications', function () {
    it('gives the list only titles and dates, newest first', async function () {
      await call(board, 'liability.create', fields({ title: `${prefix}Older`, date: new Date(Date.UTC(2001, 0, 1)) }));
      await call(board, 'liability.create', fields({ title: `${prefix}Newer`, date: new Date(Date.UTC(2002, 0, 1)) }));
      const docs = (await published('admin.liability.list', board)).filter((d) => d.title.startsWith(prefix));
      assert.deepStrictEqual(docs.map((d) => d.title), [`${prefix}Newer`, `${prefix}Older`]);
      assert.deepStrictEqual(Object.keys(docs[0]).sort(), ['_id', 'date', 'title']);
    });

    it('gives one whole document to the document view', async function () {
      const docId = await call(board, 'liability.create', fields());
      const [doc] = await published('admin.liability.document', board, docId);
      assert.deepStrictEqual(doc.text, { sv: 'Svensk text', en: 'English text' });
    });

    it('gives the treasurer nothing', async function () {
      const docId = await call(board, 'liability.create', fields());
      assert.deepStrictEqual(await published('admin.liability.list', treasurer), []);
      assert.deepStrictEqual(await published('admin.liability.document', treasurer, docId), []);
    });
  });
});
