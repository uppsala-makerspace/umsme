import assert from 'assert';
import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/roles';
import { StoreItems } from '/imports/common/collections/storeItems';
import { Payments } from '/imports/common/collections/payments';
import { Workshops } from '/imports/common/collections/workshops';
import { AuditLog } from '/imports/common/collections/auditLog';
import '/server/methods/storeItems';
import registerPublications from '/server/publications';

const prefix = 'sitest-';
const board = `${prefix}board`;
const treasurer = `${prefix}treasurer`;

const call = (userId, name, ...args) =>
  Meteor.server.method_handlers[name].apply({ userId, isSimulation: false }, args);

const published = async (name, userId, ...args) => {
  const sub = { userId, ready() {}, added() {}, changed() {}, removed() {}, onStop() {}, error(e) { throw e; } };
  const cursor = await Meteor.server.publish_handlers[name].call(sub, ...args);
  return cursor ? cursor.fetchAsync() : [];
};

let codes = 0;
const fields = (overrides = {}) => ({
  code: `${prefix}${(codes += 1)}`,
  name: { sv: `${prefix}Vara`, en: 'Item' },
  price: 50,
  bookkeepingAccount: '3010',
  requiresMembership: true,
  commentRequired: false,
  status: 'available',
  ...overrides,
});

const cleanup = async () => {
  const ids = (await StoreItems.find({ code: { $regex: `^${prefix}` } }).fetchAsync()).map((d) => d._id);
  await Payments.removeAsync({ storeItem: { $in: ids } });
  await StoreItems.removeAsync({ _id: { $in: ids } });
  await Workshops.removeAsync({ _id: { $regex: `^${prefix}` } });
  await AuditLog.removeAsync({ userId: { $regex: `^${prefix}` } });
};

describe('store items', function () {
  before(async function () {
    if (!Meteor.server.publish_handlers['admin.storeItems.list']) registerPublications();
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

  it('creates an item and logs it', async function () {
    const docId = await call(board, 'storeItems.create', fields({ code: `${prefix}lera`, description: { sv: ' Mjuk ', en: '' } }));
    const doc = await StoreItems.findOneAsync(docId);
    assert.strictEqual(doc.code, `${prefix}lera`);
    assert.deepStrictEqual(doc.description, { sv: 'Mjuk' });
    assert.ok(doc.createdAt instanceof Date && doc.updatedAt instanceof Date);
    assert.strictEqual((await AuditLog.findOneAsync({ docId })).action, 'create');
  });

  it('leaves out an empty price, so the buyer sets it', async function () {
    const docId = await call(board, 'storeItems.create', fields({ price: null, minPrice: 20 }));
    const doc = await StoreItems.findOneAsync(docId);
    assert.strictEqual('price' in doc, false);
    assert.strictEqual(doc.minPrice, 20);
  });

  it('refuses a code already in use, and one with capitals', async function () {
    await call(board, 'storeItems.create', fields({ code: `${prefix}dup` }));
    await assert.rejects(call(board, 'storeItems.create', fields({ code: `${prefix}dup` })), /duplicate-code/);
    await assert.rejects(call(board, 'storeItems.create', fields({ code: `${prefix}Ny Vara` })), /Code/);
  });

  it('refuses the treasurer', async function () {
    await assert.rejects(call(treasurer, 'storeItems.create', fields()), /not-authorized/);
  });

  it('updates an item, clearing what was emptied, and refuses a stale edit', async function () {
    const docId = await call(board, 'storeItems.create', fields({ minPrice: 10 }));
    const { updatedAt } = await StoreItems.findOneAsync(docId);
    const next = fields({ code: (await StoreItems.findOneAsync(docId)).code, status: 'hidden', price: 30, minPrice: null });
    await call(board, 'storeItems.update', docId, next, updatedAt);
    const doc = await StoreItems.findOneAsync(docId);
    assert.strictEqual(doc.status, 'hidden');
    assert.strictEqual(doc.price, 30);
    assert.strictEqual('minPrice' in doc, false);
    await assert.rejects(call(board, 'storeItems.update', docId, next, updatedAt), /conflict/);
  });

  it('links workshops, and refuses one that does not exist', async function () {
    const docId = await call(board, 'storeItems.create', fields());
    await Workshops.insertAsync({ _id: `${prefix}w1`, name: { sv: 'Keramik' }, kind: 'workshop', status: 'established' });
    await call(board, 'storeItems.setWorkshops', docId, [`${prefix}w1`, `${prefix}w1`]);
    assert.deepStrictEqual((await StoreItems.findOneAsync(docId)).workshopIds, [`${prefix}w1`]);
    await assert.rejects(call(board, 'storeItems.setWorkshops', docId, [`${prefix}missing`]), /not-found/);
  });

  it('sums the sales', async function () {
    const docId = await call(board, 'storeItems.create', fields());
    for (const amount of [50, 70]) {
      await Payments.insertAsync({ hash: `${prefix}${amount}`, type: 'swish', amount, date: new Date(), storeItem: docId });
    }
    assert.deepStrictEqual(await call(board, 'storeItems.sales', docId), { count: 2, total: 120 });
  });

  it('removes an item never bought, but not one bought or with an image', async function () {
    const free = await call(board, 'storeItems.create', fields());
    await call(board, 'storeItems.remove', free);
    assert.strictEqual(await StoreItems.findOneAsync(free), undefined);

    const bought = await call(board, 'storeItems.create', fields());
    await Payments.insertAsync({ hash: `${prefix}b`, type: 'swish', amount: 50, date: new Date(), storeItem: bought });
    await assert.rejects(call(board, 'storeItems.remove', bought), /bought/);

    const pictured = await call(board, 'storeItems.create', fields());
    await StoreItems.updateAsync(pictured, { $set: { imageFileId: 'x.png', imageMimeType: 'image/png' } });
    await assert.rejects(call(board, 'storeItems.remove', pictured), /has-image/);
  });

  it('gives the list no descriptions, and the treasurer nothing', async function () {
    await call(board, 'storeItems.create', fields({ description: { sv: 'Lång text' } }));
    const [doc] = (await published('admin.storeItems.list', board)).filter((d) => d.code?.startsWith(prefix));
    assert.strictEqual('description' in doc, false);
    assert.deepStrictEqual(await published('admin.storeItems.list', treasurer), []);
    assert.deepStrictEqual(await published('admin.storeItems.workshops', treasurer), []);
  });
});
