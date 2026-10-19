import { Meteor } from 'meteor/meteor';
import { Groups } from '/imports/common/collections/groups';
import { GroupMemberships } from '/imports/common/collections/groupMemberships';
import { Workshops } from '/imports/common/collections/workshops';
import { Spaces } from '/imports/common/collections/spaces';
import { Members } from '/imports/common/collections/members';
import { ExpenseAccounts } from '/imports/common/collections/expenseAccounts';
import { GROUP_TYPES, JOIN_POLICIES } from '/imports/common/lib/groupRules';
import { syncLinkedRoleById } from '/imports/common/server/linkedRoleSync';
import { recordChange } from '/imports/common/server/auditLog';
import { text, bilingual, setOrUnset } from './text';

/**
 * Groups (grupper): steering groups run a workshop or area of interest,
 * responsibility groups sit under a steering group, function groups stand on
 * their own (common/lib/groupRules.js). A group's linkedRole is synced from
 * its active members (common/server/linkedRoleSync.js), so every change to
 * its members, its responsible or its linkedRole re-syncs it here.
 */

const DOMAIN = 'groups';

const exists = async (collection, ids, what) => {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return unique;
  const found = await collection.find({ _id: { $in: unique } }, { fields: { _id: 1 } }).countAsync();
  if (found !== unique.length) throw new Meteor.Error('not-found', `No such ${what}`);
  return unique;
};

/** The fields the form edits, checked against the rules the schema cannot express. */
const changesOf = async (fields, selfId, current) => {
  const type = fields.type;
  if (!GROUP_TYPES.includes(type)) throw new Meteor.Error('bad-type', `Unknown group type "${type}"`);
  const joinPolicy = fields.joinPolicy || 'request-responsible';
  if (!JOIN_POLICIES.includes(joinPolicy)) throw new Meteor.Error('bad-join-policy', `Unknown join policy "${joinPolicy}"`);
  const linkedRole = text(fields.linkedRole);
  if (linkedRole === 'admin') throw new Meteor.Error('bad-role', 'The admin role cannot be linked to a group');
  if (linkedRole && !(await Meteor.roles.findOneAsync(linkedRole))) throw new Meteor.Error('bad-role', `No role "${linkedRole}"`);
  if (linkedRole && joinPolicy === 'open') {
    throw new Meteor.Error('open-with-role', 'A group that grants a role cannot be open to anyone joining');
  }
  const parentGroupId = text(fields.parentGroupId);
  if (type === 'responsibility' && !parentGroupId) {
    throw new Meteor.Error('parent-required', 'A responsibility group needs its steering group as parent');
  }
  if (parentGroupId) {
    if (parentGroupId === selfId) throw new Meteor.Error('bad-parent', 'A group cannot be its own parent');
    const parent = await Groups.findOneAsync(parentGroupId);
    if (parent?.type !== 'steering') throw new Meteor.Error('bad-parent', 'The parent must be a steering group');
  }
  if (current?.type === 'steering' && type !== 'steering') {
    const dependent = (await Groups.findOneAsync({ parentGroupId: selfId })) || (await Workshops.findOneAsync({ groupId: selfId }));
    if (dependent) {
      throw new Meteor.Error('steering-in-use', 'A workshop or responsibility group depends on this steering group; it must stay one');
    }
  }
  const responsibleMemberId = text(fields.responsibleMemberId);
  await exists(Members, [responsibleMemberId], 'member');
  const relatedGroupIds = (await exists(Groups, fields.relatedGroupIds || [], 'group')).filter((id) => id !== selfId);
  const relatedWorkshopIds = await exists(Workshops, fields.relatedWorkshopIds || [], 'workshop');
  const primarySpaceId = text(fields.primarySpaceId);
  const secondarySpaceIds = (await exists(Spaces, [primarySpaceId, ...(fields.secondarySpaceIds || [])], 'space'))
    .filter((id) => id !== primarySpaceId);

  const changes = { $set: {}, $unset: {} };
  changes.$set.name = { sv: text(fields.name?.sv), ...(text(fields.name?.en) ? { en: text(fields.name.en) } : {}) };
  changes.$set.type = type;
  changes.$set.joinPolicy = joinPolicy;
  changes.$set.allowJoinRequests = fields.allowJoinRequests !== false;
  setOrUnset(changes, {
    tag: bilingual(fields.tag),
    description: bilingual(fields.description),
    rules: bilingual(fields.rules),
    slackChannel: text(fields.slackChannel),
    guidesUrl: text(fields.guidesUrl),
    linkedRole,
    parentGroupId,
    responsibleMemberId,
    relatedGroupIds,
    relatedWorkshopIds,
    primarySpaceId,
    secondarySpaceIds,
  });
  return changes;
};

const current = async (docId, expectedUpdatedAt) => {
  const before = await Groups.findOneAsync(docId);
  if (!before) throw new Meteor.Error('not-found', 'No such group');
  if (expectedUpdatedAt !== undefined
      && (before.updatedAt?.getTime() ?? null) !== (expectedUpdatedAt?.getTime() ?? null)) {
    throw new Meteor.Error('conflict', 'Someone else changed this group; reload it and try again');
  }
  return before;
};

/** Make someone an active member: a new membership, or an approved request. */
const activate = async (groupId, memberId, userId) => {
  const existing = await GroupMemberships.findOneAsync({ groupId, memberId });
  const approval = { state: 'active', approvedAt: new Date(), approvedBy: '__system__' };
  if (existing?.state === 'active') return;
  if (existing) {
    await GroupMemberships.updateAsync(existing._id, { $set: approval });
    await recordChange({ userId, domain: 'groupMemberships', action: 'approve', docId: existing._id, before: existing, after: { ...existing, ...approval } });
    return;
  }
  const doc = { groupId, memberId, requestedAt: new Date(), ...approval };
  const docId = await GroupMemberships.insertAsync(doc);
  await recordChange({ userId, domain: 'groupMemberships', action: 'add', docId, after: doc });
};

/** @returns {Promise<string>} the new group's id */
export const createGroup = async (fields, { userId }) => {
  const { $set } = await changesOf(fields, null, null);
  const now = new Date();
  const doc = { ...$set, createdAt: now, updatedAt: now };
  const docId = await Groups.insertAsync(doc);
  await recordChange({ userId, domain: DOMAIN, action: 'create', docId, after: doc });
  if (doc.responsibleMemberId) await activate(docId, doc.responsibleMemberId, userId);
  await syncLinkedRoleById(docId);
  return docId;
};

/**
 * Update a group, refused with 'conflict' if it changed since
 * `expectedUpdatedAt`. A new responsible becomes an active member.
 */
export const updateGroup = async (docId, fields, { userId, expectedUpdatedAt }) => {
  const before = await current(docId, expectedUpdatedAt);
  const { $set, $unset } = await changesOf(fields, docId, before);
  $set.updatedAt = new Date();
  await Groups.updateAsync(docId, Object.keys($unset).length ? { $set, $unset } : { $set });
  await recordChange({ userId, domain: DOMAIN, action: 'update', docId, before, after: await Groups.findOneAsync(docId) });
  if ($set.responsibleMemberId) await activate(docId, $set.responsibleMemberId, userId);
  await syncLinkedRoleById(docId);
};

/** What refers to a group: its workshop, responsibility groups, expense accounts, members. */
export const groupReferences = async (docId) => {
  const workshop = await Workshops.findOneAsync({ groupId: docId }, { fields: { name: 1, kind: 1 } });
  const childGroups = await Groups.find({ parentGroupId: docId }, { fields: { name: 1 } }).fetchAsync();
  const expenseAccounts = await ExpenseAccounts.find(
    { $or: [{ groupIds: docId }, { approverGroupIds: docId }] }, { fields: { name: 1 } },
  ).fetchAsync();
  const memberships = await GroupMemberships.find({ groupId: docId }).countAsync();
  return { workshop: workshop || null, childGroups, expenseAccounts, memberships };
};

/** Remove a group; refused while anything refers to it or it has an image. */
export const removeGroup = async (docId, { userId }) => {
  const before = await current(docId);
  if (before.imageFileId) throw new Meteor.Error('has-image', 'Remove the image before the group can be deleted');
  const { workshop, childGroups, expenseAccounts, memberships } = await groupReferences(docId);
  if (workshop || childGroups.length || expenseAccounts.length || memberships) {
    throw new Meteor.Error('in-use', 'A workshop, responsibility group, expense account or member refers to this group');
  }
  await Groups.removeAsync(docId);
  await recordChange({ userId, domain: DOMAIN, action: 'remove', docId, before });
};

/** Add a member, or approve their request. */
export const addGroupMember = async (groupId, memberId, { userId }) => {
  await current(groupId);
  await exists(Members, [memberId], 'member');
  await activate(groupId, memberId, userId);
  await syncLinkedRoleById(groupId);
};

/** Turn down a request to join. */
export const rejectGroupRequest = async (groupId, memberId, { userId }) => {
  const request = await GroupMemberships.findOneAsync({ groupId, memberId, state: 'pending' });
  if (!request) throw new Meteor.Error('not-found', 'No such request');
  await GroupMemberships.removeAsync(request._id);
  await recordChange({ userId, domain: 'groupMemberships', action: 'reject', docId: request._id, before: request });
};

/** Remove a member; not the responsible, who must be replaced or cleared first. */
export const removeGroupMember = async (groupId, memberId, { userId }) => {
  const group = await current(groupId);
  if (group.responsibleMemberId === memberId) {
    throw new Meteor.Error('is-responsible', 'This member is the group responsible; choose another responsible, or none, first');
  }
  const membership = await GroupMemberships.findOneAsync({ groupId, memberId });
  if (!membership) throw new Meteor.Error('not-found', 'Not a member');
  await GroupMemberships.removeAsync(membership._id);
  await recordChange({ userId, domain: 'groupMemberships', action: 'remove', docId: membership._id, before: membership });
  await syncLinkedRoleById(groupId);
};
