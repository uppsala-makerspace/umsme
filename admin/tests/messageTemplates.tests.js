import assert from 'assert';
import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/roles';
import { MessageTemplates } from '/imports/common/collections/templates';
import { AuditLog } from '/imports/common/collections/auditLog';
import { SAMPLE_DATA, TEMPLATE_VARIABLE_GROUPS, testTemplates } from '/imports/common/lib/messageTemplates';
import '/server/methods/messageTemplates';
import registerPublications from '/server/publications';

const prefix = 'mtpltest-';
const board = `${prefix}board`;
const treasurer = `${prefix}treasurer`;

const call = (userId, name, ...args) =>
  Meteor.server.method_handlers[name].apply({ userId, isSimulation: false }, args);

const published = async (name, userId, ...args) => {
  const sub = { userId, ready() {}, added() {}, changed() {}, removed() {}, onStop() {}, error(e) { throw e; } };
  const cursor = await Meteor.server.publish_handlers[name].call(sub, ...args);
  return cursor ? cursor.fetchAsync() : [];
};

const fields = (overrides = {}) => ({
  name: `${prefix}Template`,
  type: 'status',
  membershiptype: 'lab',
  membertype: 'family',
  subject: 'Hej <%= name %>',
  messagetext: 'Ditt labb gäller till <%= labEndDate %>.',
  auto: false,
  ...overrides,
});

const cleanup = async () => {
  await MessageTemplates.removeAsync({ name: { $regex: `^${prefix}` } });
  await AuditLog.removeAsync({ userId: { $regex: `^${prefix}` } });
};

describe('message templates', function () {
  before(async function () {
    if (!Meteor.server.publish_handlers['admin.messageTemplates.list']) registerPublications();
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

  describe('checking a template', function () {
    it('has a sample value for every documented variable', function () {
      for (const { variables } of TEMPLATE_VARIABLE_GROUPS) {
        for (const { name } of variables) assert.ok(name in SAMPLE_DATA, name);
      }
    });

    it('renders with the sample data', function () {
      const result = testTemplates({ subject: 'Hej <%= name %>', messagetext: '<% if (liability) { %>ok<% } %>' });
      assert.strictEqual(result.hasError, false);
      assert.match(result.message, /Hej Sample Member/);
      assert.match(result.message, /ok/);
    });

    it('reports a field that does not compile, and an empty template', function () {
      assert.match(testTemplates({ subject: 'x', messagetext: 'Hej <%= name + %>' }).message, /messagetext/);
      assert.strictEqual(testTemplates({}).hasError, true);
    });

    it('takes a lone <%= without %> as plain text', function () {
      assert.strictEqual(testTemplates({ messagetext: 'Hej <%= name ' }).hasError, false);
    });
  });

  describe('create', function () {
    it('creates a template, not deprecated, and logs it', async function () {
      const docId = await call(board, 'messageTemplates.create', fields({ name: `  ${prefix}Trimmed  ` }));
      const doc = await MessageTemplates.findOneAsync(docId);
      assert.strictEqual(doc.name, `${prefix}Trimmed`);
      assert.strictEqual(doc.deprecated, false);
      assert.strictEqual(doc.membershiptype, 'lab');
      assert.ok(doc.created instanceof Date && doc.modified instanceof Date);
      assert.strictEqual((await AuditLog.findOneAsync({ docId })).action, 'create');
    });

    it('leaves out an empty membership or member type, meaning any', async function () {
      const docId = await call(board, 'messageTemplates.create', fields({ membershiptype: '', membertype: null }));
      const doc = await MessageTemplates.findOneAsync(docId);
      assert.strictEqual('membershiptype' in doc, false);
      assert.strictEqual('membertype' in doc, false);
    });

    it('refuses a template that does not compile', async function () {
      await assert.rejects(call(board, 'messageTemplates.create', fields({ messagetext: '<%= name + %>' })), /invalid-template/);
    });

    it('refuses an unknown message type', async function () {
      await assert.rejects(call(board, 'messageTemplates.create', fields({ type: 'spam' })), /bad-type/);
    });

    it('refuses the treasurer and anyone not logged in', async function () {
      await assert.rejects(call(treasurer, 'messageTemplates.create', fields()), /not-authorized/);
      await assert.rejects(call(null, 'messageTemplates.create', fields()), /not-authorized/);
    });
  });

  describe('update', function () {
    it('changes a template, can deprecate it, and logs what changed', async function () {
      const docId = await call(board, 'messageTemplates.create', fields());
      const { modified } = await MessageTemplates.findOneAsync(docId);
      await call(board, 'messageTemplates.update', docId, fields({ subject: 'Ny', deprecated: true }), modified);
      const doc = await MessageTemplates.findOneAsync(docId);
      assert.strictEqual(doc.subject, 'Ny');
      assert.strictEqual(doc.deprecated, true);
      const entry = await AuditLog.findOneAsync({ docId, action: 'update' });
      assert.deepStrictEqual(Object.keys(entry.changes).sort(), ['deprecated', 'subject']);
    });

    it('clears a membership type set back to any', async function () {
      const docId = await call(board, 'messageTemplates.create', fields());
      const { modified } = await MessageTemplates.findOneAsync(docId);
      await call(board, 'messageTemplates.update', docId, fields({ membershiptype: '' }), modified);
      assert.strictEqual('membershiptype' in (await MessageTemplates.findOneAsync(docId)), false);
    });

    it('refuses to overwrite a change made since the editor loaded the template', async function () {
      const docId = await call(board, 'messageTemplates.create', fields());
      const { modified: loaded } = await MessageTemplates.findOneAsync(docId);
      await call(board, 'messageTemplates.update', docId, fields({ subject: 'First' }), loaded);
      await assert.rejects(call(board, 'messageTemplates.update', docId, fields({ subject: 'Second' }), loaded), /conflict/);
    });

    it('refuses an update that does not compile', async function () {
      const docId = await call(board, 'messageTemplates.create', fields());
      const { modified } = await MessageTemplates.findOneAsync(docId);
      await assert.rejects(call(board, 'messageTemplates.update', docId, fields({ subject: '<% } %>' }), modified), /invalid-template/);
    });
  });

  describe('remove', function () {
    it('removes a template and logs what it was', async function () {
      const docId = await call(board, 'messageTemplates.create', fields());
      await call(board, 'messageTemplates.remove', docId);
      assert.strictEqual(await MessageTemplates.findOneAsync(docId), undefined);
      assert.strictEqual((await AuditLog.findOneAsync({ docId, action: 'remove' })).changes.name.from, `${prefix}Template`);
    });

    it('refuses the treasurer', async function () {
      const docId = await call(board, 'messageTemplates.create', fields());
      await assert.rejects(call(treasurer, 'messageTemplates.remove', docId), /not-authorized/);
    });
  });

  describe('publications', function () {
    it('gives the list no texts', async function () {
      await call(board, 'messageTemplates.create', fields());
      const [doc] = (await published('admin.messageTemplates.list', board)).filter((d) => d.name.startsWith(prefix));
      assert.deepStrictEqual(Object.keys(doc).sort(), ['_id', 'auto', 'deprecated', 'membershiptype', 'membertype', 'name', 'type']);
    });

    it('gives the treasurer nothing', async function () {
      const docId = await call(board, 'messageTemplates.create', fields());
      assert.deepStrictEqual(await published('admin.messageTemplates.list', treasurer), []);
      assert.deepStrictEqual(await published('admin.messageTemplates.template', treasurer, docId), []);
    });
  });
});
