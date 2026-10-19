import assert from 'assert';
import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/roles';
import { ExpenseAccounts } from '/imports/common/collections/expenseAccounts';
import { ExpenseBudgets } from '/imports/common/collections/expenseBudgets';
import { Expenses } from '/imports/common/collections/expenses';
import { Groups } from '/imports/common/collections/groups';
import { GroupMemberships } from '/imports/common/collections/groupMemberships';
import { Members } from '/imports/common/collections/members';
import '/server/methods/expenseAccounts';
import '/server/methods/expenses';

const prefix = 'exacctest-';
const board = `${prefix}board`;
const treasurer = `${prefix}treasurer`;
const call = (userId, name, ...args) =>
  Meteor.server.method_handlers[name].apply({ userId, isSimulation: false }, args);
const account = (overrides = {}) => ({ name: `${prefix}Konto`, explanation: 'Till test', ...overrides });

describe('expense accounts', function () {
  let groupId;
  before(async function () {
    for (const [_id, role] of [[board, 'board'], [treasurer, 'treasurer']]) {
      await Meteor.users.removeAsync(_id);
      await Roles.createRoleAsync(role, { unlessExists: true });
      await Meteor.users.insertAsync({ _id, emails: [{ address: `${_id}@example.org` }] });
      await Roles.addUsersToRolesAsync(_id, role, null);
    }
    await Members.insertAsync({ _id: `${prefix}in`, mid: 'X1', name: 'Exacc Inside' });
    await Members.insertAsync({ _id: `${prefix}out`, mid: 'X2', name: 'Exacc Outside' });
    groupId = await Groups.insertAsync({ name: { sv: `${prefix}Grupp` }, type: 'function', joinPolicy: 'request-responsible', allowJoinRequests: true });
    await GroupMemberships.insertAsync({ groupId, memberId: `${prefix}in`, state: 'active', requestedAt: new Date() });
  });

  afterEach(async function () {
    const ids = (await ExpenseAccounts.find({ name: { $regex: `^${prefix}` } }).fetchAsync()).map((a) => a._id);
    await Expenses.removeAsync({ expenseAccountId: { $in: ids } });
    await ExpenseBudgets.removeAsync({ expenseAccountId: { $in: ids } });
    await ExpenseAccounts.removeAsync({ _id: { $in: ids } });
  });

  after(async function () {
    await GroupMemberships.removeAsync({ groupId });
    await Groups.removeAsync(groupId);
    await Members.removeAsync({ _id: { $regex: `^${prefix}` } });
    await Meteor.roleAssignment.removeAsync({ 'user._id': { $regex: `^${prefix}` } });
    await Meteor.users.removeAsync({ _id: { $regex: `^${prefix}` } });
  });

  it('creates and updates an account with groups, approvers and object codes', async function () {
    const docId = await call(board, 'expenseAccounts.create', account({ groupIds: [groupId], approverMemberIds: [`${prefix}in`], dimensions: { 1: ' "VERK" ' } }));
    const doc = await ExpenseAccounts.findOneAsync(docId);
    assert.deepStrictEqual(doc.dimensions, { 1: 'VERK' });
    await call(board, 'expenseAccounts.update', docId, account({ groupIds: [groupId] }), doc.updatedAt);
    assert.strictEqual('approverMemberIds' in (await ExpenseAccounts.findOneAsync(docId)), false);
    await assert.rejects(call(board, 'expenseAccounts.update', docId, account(), doc.updatedAt), /conflict/);
  });

  it('keeps approvers within the account’s groups, and the treasurer out', async function () {
    await assert.rejects(call(board, 'expenseAccounts.create', account({ groupIds: [groupId], approverMemberIds: [`${prefix}out`] })), /approver-outside-groups/);
    await assert.rejects(call(treasurer, 'expenseAccounts.create', account()), /not-authorized/);
  });

  it('keeps an account with a budget, and offers the groups’ members as approvers', async function () {
    const docId = await call(board, 'expenseAccounts.create', account({ groupIds: [groupId] }));
    await ExpenseBudgets.insertAsync({ expenseAccountId: docId, year: 2026, amount: 100, setAt: new Date(), createdAt: new Date() });
    await assert.rejects(call(board, 'expenseAccounts.remove', docId), /in-use/);
    const { candidates } = await call(treasurer, 'expenseAccounts.approverChoices', [groupId], []);
    assert.deepStrictEqual(candidates.map((c) => c.name), ['Exacc Inside']);
  });

  it('pages the expenses with names, and the work queues', async function () {
    const docId = await call(board, 'expenseAccounts.create', account({ groupIds: [groupId] }));
    for (const [place, status, type] of [['A', 'submitted', 'receipt'], ['B', 'confirmed', 'invoice']]) {
      await Expenses.insertAsync({ memberId: `${prefix}in`, type, driveFileId: 'x', mimeType: 'image/png', status, date: new Date(), createdAt: new Date(), amount: 10, expenseAccountId: docId, place: `${prefix}${place}` });
    }
    const confirm = await call(treasurer, 'expenses.page', { view: 'confirm', search: prefix });
    assert.deepStrictEqual(confirm.rows.map((r) => [r.place, r.memberName, r.accountName]), [[`${prefix}A`, 'Exacc Inside', `${prefix}Konto`]]);
    const invoices = await call(treasurer, 'expenses.page', { view: 'invoices', search: 'exacc inside' });
    assert.deepStrictEqual(invoices.rows.map((r) => r.place), [`${prefix}B`]);
  });
});
