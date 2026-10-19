import { Meteor } from 'meteor/meteor';
import { ExpenseAccounts } from '/imports/common/collections/expenseAccounts';
import { Expenses } from '/imports/common/collections/expenses';
import { ExpenseBudgets } from '/imports/common/collections/expenseBudgets';
import { Groups } from '/imports/common/collections/groups';
import { GroupMemberships } from '/imports/common/collections/groupMemberships';
import { Members } from '/imports/common/collections/members';
import { recordChange } from '/imports/common/server/auditLog';
import { text, setOrUnset } from '../groups/text';

/**
 * Expense accounts (utläggskonton): what members of the account's groups may
 * spend on, who approves, and the object codes their bookkeeping entries get.
 * Per the guideline an account belongs to at least one group and its
 * approvers are active members of those groups; approver groups may be any
 * group. An account that expenses or budgets refer to stays.
 */

const DOMAIN = 'expenseAccounts';

const existing = async (collection, ids, what) => {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length && (await collection.find({ _id: { $in: unique } }).countAsync()) !== unique.length) {
    throw new Meteor.Error('not-found', `No such ${what}`);
  }
  return unique;
};

/** The active members of these groups. */
const activeIn = async (groupIds) => new Set((await GroupMemberships.find(
  { groupId: { $in: groupIds }, state: 'active' }, { fields: { memberId: 1 } },
).fetchAsync()).map((m) => m.memberId));

/** Object codes per dimension number; quotes go, as they become SIE #OBJEKT keys. */
const dimensionsOf = (dimensions) => {
  const clean = {};
  for (const [nr, value] of Object.entries(dimensions || {})) {
    const code = String(value || '').replace(/["']/g, '').trim();
    if (code) clean[String(nr)] = code;
  }
  return Object.keys(clean).length ? clean : null;
};

const changesOf = async (fields) => {
  const name = text(fields.name);
  if (!name) throw new Meteor.Error('bad-name', 'An expense account needs a name');
  const explanation = text(fields.explanation);
  if (!explanation) throw new Meteor.Error('bad-explanation', 'An expense account needs an explanation');
  const groupIds = await existing(Groups, fields.groupIds || [], 'group');
  const approverGroupIds = await existing(Groups, fields.approverGroupIds || [], 'group');
  const approverMemberIds = await existing(Members, fields.approverMemberIds || [], 'member');
  if (approverMemberIds.length) {
    const eligible = await activeIn(groupIds);
    if (approverMemberIds.some((id) => !eligible.has(id))) {
      throw new Meteor.Error('approver-outside-groups', 'An approver must be an active member of one of the account’s groups');
    }
  }
  const changes = { $set: { name, explanation }, $unset: {} };
  setOrUnset(changes, { dimensions: dimensionsOf(fields.dimensions), groupIds, approverMemberIds, approverGroupIds });
  return changes;
};

const current = async (docId, expectedUpdatedAt) => {
  const before = await ExpenseAccounts.findOneAsync(docId);
  if (!before) throw new Meteor.Error('not-found', 'No such expense account');
  if (expectedUpdatedAt !== undefined
      && (before.updatedAt?.getTime() ?? null) !== (expectedUpdatedAt?.getTime() ?? null)) {
    throw new Meteor.Error('conflict', 'Someone else changed this expense account; reload it and try again');
  }
  return before;
};

/** @returns {Promise<string>} the new account's id */
export const createExpenseAccount = async (fields, { userId }) => {
  const { $set } = await changesOf(fields);
  const now = new Date();
  const doc = { ...$set, createdAt: now, updatedAt: now };
  const docId = await ExpenseAccounts.insertAsync(doc);
  await recordChange({ userId, domain: DOMAIN, action: 'create', docId, after: doc });
  return docId;
};

/** Update an account, refused with 'conflict' if it changed since `expectedUpdatedAt`. */
export const updateExpenseAccount = async (docId, fields, { userId, expectedUpdatedAt }) => {
  const before = await current(docId, expectedUpdatedAt);
  const { $set, $unset } = await changesOf(fields);
  $set.updatedAt = new Date();
  await ExpenseAccounts.updateAsync(docId, Object.keys($unset).length ? { $set, $unset } : { $set });
  await recordChange({ userId, domain: DOMAIN, action: 'update', docId, before, after: await ExpenseAccounts.findOneAsync(docId) });
};

/** What keeps an account: expenses on it, and budgets. */
export const expenseAccountUse = async (docId) => ({
  expenses: await Expenses.find({ expenseAccountId: docId }).countAsync(),
  budgets: await ExpenseBudgets.find({ expenseAccountId: docId }).countAsync(),
});

/** Remove an account, refused while an expense or a budget refers to it. */
export const removeExpenseAccount = async (docId, { userId }) => {
  const before = await current(docId);
  const use = await expenseAccountUse(docId);
  if (use.expenses || use.budgets) throw new Meteor.Error('in-use', 'Expenses or budgets refer to this account');
  await ExpenseAccounts.removeAsync(docId);
  await recordChange({ userId, domain: DOMAIN, action: 'remove', docId, before });
};

/**
 * Who could approve on an account with these groups: the active members of
 * each group, by name, with the groups they are in; and how many active
 * members each group has (for the approver groups).
 */
export const approverChoices = async (groupIds, approverGroupIds = []) => {
  const groupNames = Object.fromEntries((await Groups.find({ _id: { $in: [...groupIds, ...approverGroupIds] } }, { fields: { name: 1 } }).fetchAsync())
    .map((g) => [g._id, g.name?.sv || g._id]));
  const memberships = await GroupMemberships.find({ groupId: { $in: [...groupIds, ...approverGroupIds] }, state: 'active' }, { fields: { groupId: 1, memberId: 1 } }).fetchAsync();
  const names = Object.fromEntries((await Members.find({ _id: { $in: memberships.map((m) => m.memberId) } }, { fields: { name: 1, mid: 1 } }).fetchAsync())
    .map((m) => [m._id, m]));
  const candidates = new Map();
  for (const ms of memberships.filter((m) => groupIds.includes(m.groupId))) {
    const entry = candidates.get(ms.memberId) || { _id: ms.memberId, name: names[ms.memberId]?.name || ms.memberId, mid: names[ms.memberId]?.mid, groups: [] };
    entry.groups.push(groupNames[ms.groupId]);
    candidates.set(ms.memberId, entry);
  }
  const activeCounts = Object.fromEntries(approverGroupIds.map((id) => [id, memberships.filter((m) => m.groupId === id).length]));
  const approverGroupMembers = [...new Set(memberships.filter((m) => approverGroupIds.includes(m.groupId)).map((m) => m.memberId))];
  return {
    candidates: [...candidates.values()].map((c) => ({ ...c, groups: c.groups.sort() })).sort((a, b) => a.name.localeCompare(b.name, 'sv')),
    activeCounts,
    approverGroupMembers,
  };
};
