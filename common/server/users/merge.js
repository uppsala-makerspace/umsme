import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/roles';
import { Members } from '/imports/common/collections/members';
import { Memberships } from '/imports/common/collections/memberships';
import { Comments } from '/imports/common/collections/comments';
import { PushSubs } from '/imports/common/collections/pushSubs';
import { Activities } from '/imports/common/collections/activities';
import { Events } from '/imports/common/collections/events';
import { StorageUnits, StorageOffers, StorageEvents } from '/imports/common/collections/storage';
import { normalizeEmail } from '/imports/common/lib/memberMatch';
import { memberForUser } from '/imports/common/server/memberForUser';
import { planMemberMerge, mergeMembers } from '/imports/common/server/members/merge';
import { recordChange } from '/imports/common/server/auditLog';
import { ADMIN_ROLES } from './users';

/**
 * Merging two login accounts of one person: the removed account (R) is taken
 * over by the kept one (K). K gets every email of both (verified if verified
 * on either), R's Google or Facebook login and password where K has none,
 * R's sessions (so whoever is signed in as R is signed in as K after a
 * reload), push subscriptions, roles and what R is recorded as having done.
 * If the two accounts find different members, those are merged as well
 * (common/server/members/merge.js), keeping the one chosen.
 *
 * There is no transaction. R is removed last, so a merge that stops half-way
 * can be run again.
 */

const OAUTH = ['google', 'facebook'];

// Fields that record which user did something: { collection, field, label }.
const ACTOR_MOVES = [
  { collection: Comments, field: 'about', label: 'Comments' },
  { collection: Activities, field: 'createdBy', label: 'Activities created' },
  { collection: Events, field: 'createdBy', label: 'Events created' },
  { collection: StorageUnits, field: 'assigned_by', label: 'Storage units assigned' },
  { collection: StorageOffers, field: 'offered_by', label: 'Storage offers made' },
  { collection: StorageEvents, field: 'actor', label: 'Storage events' },
];

const userOf = async (userId, what) => {
  const user = await Meteor.users.findOneAsync(userId);
  if (!user) throw new Meteor.Error('not-found', `No such user (${what})`);
  return user;
};

const rolesOf = async (userId) => [...new Set(
  (await Meteor.roleAssignment.find({ 'user._id': userId }).fetchAsync()).map((a) => a.role._id),
)];

/** Both accounts' emails, K's first, each once; verified if verified on either. */
export const mergedEmails = (kept, removed) => {
  const byAddress = new Map();
  for (const e of [...(kept.emails || []), ...(removed.emails || [])]) {
    if (!e?.address) continue;
    const key = normalizeEmail(e.address);
    const seen = byAddress.get(key);
    if (seen) seen.verified = seen.verified || !!e.verified;
    else byAddress.set(key, { address: e.address, verified: !!e.verified });
  }
  return [...byAddress.values()];
};

// The latest end of a member's memberships, or null.
const lastEnd = async (memberId) => {
  const ends = (await Memberships.find({ mid: memberId }).fetchAsync())
    .flatMap((m) => [m.memberend, m.labend]).filter(Boolean).map((d) => d.getTime());
  return ends.length ? Math.max(...ends) : null;
};

/**
 * Of two members, the one to keep by default: the one with memberships, and
 * of two with memberships the one that lasts the longest.
 */
export const defaultKeptMember = async (a, b) => {
  const [endA, endB] = [await lastEnd(a._id), await lastEnd(b._id)];
  if (endA === null && endB !== null) return b;
  if (endB === null && endA !== null) return a;
  return (endB ?? 0) > (endA ?? 0) ? b : a;
};

const accountSummary = async (user, member) => ({
  _id: user._id,
  username: user.username || null,
  emails: (user.emails || []).map((e) => ({ address: e.address, verified: !!e.verified })),
  logins: [
    ...(user.services?.password ? ['password'] : []),
    ...OAUTH.filter((s) => user.services?.[s]),
  ],
  roles: await rolesOf(user._id),
  lastSeenAt: user.lastSeenAt || null,
  member: member ? { _id: member._id, mid: member.mid, name: member.name, email: member.email } : null,
});

/**
 * What merging would do, without changing anything.
 *
 * @param {string} keptId the account that stays
 * @param {string} removedId the account taken over and removed
 * @param {{keptMemberId?: string, actorId?: string}} [options] keptMemberId: of
 *   two members, the one to keep (by default defaultKeptMember); actorId:
 *   whoever merges, who may not remove their own account
 */
export const planUserMerge = async (keptId, removedId, { keptMemberId = null, actorId = null } = {}) => {
  const kept = await userOf(keptId, 'kept');
  const removed = await userOf(removedId, 'removed');
  const blockers = [];
  const warnings = [];
  if (kept._id === removed._id) blockers.push('The two accounts are the same.');
  if ([kept, removed].some((u) => u.username === 'admin')) blockers.push('The admin login cannot be merged.');
  if (actorId && removed._id === actorId) blockers.push('You cannot merge away your own account.');
  for (const service of OAUTH) {
    const [k, r] = [kept.services?.[service]?.id, removed.services?.[service]?.id];
    if (k && r && k !== r) blockers.push(`Both accounts sign in with different ${service} accounts.`);
  }
  if (kept.services?.password && removed.services?.password) {
    warnings.push('Both accounts have a password. The kept account\'s stays; the other one\'s stops working.');
  }

  const keptMember = await memberForUser(kept);
  const removedMember = await memberForUser(removed);
  let members = null;
  if (keptMember && removedMember && keptMember._id !== removedMember._id) {
    const dest = keptMemberId
      ? [keptMember, removedMember].find((m) => m._id === keptMemberId)
      : await defaultKeptMember(keptMember, removedMember);
    if (!dest) throw new Meteor.Error('bad-member', 'The member to keep must be one of the two');
    const source = dest._id === keptMember._id ? removedMember : keptMember;
    const memberPlan = await planMemberMerge(source, dest, { accountsMerged: true });
    blockers.push(...memberPlan.blockers);
    members = { keptMemberId: dest._id, plan: memberPlan };
  }

  const moves = [];
  const count = async (label, collection, selector) => {
    const n = await collection.find(selector).countAsync();
    if (n > 0) moves.push({ label, count: n });
  };
  await count('Push subscriptions', PushSubs, { userId: removed._id });
  for (const { collection, field, label } of ACTOR_MOVES) await count(label, collection, { [field]: removed._id });
  const sessions = (removed.services?.resume?.loginTokens || []).filter((t) => !t.impersonatedBy).length;
  if (sessions > 0) moves.push({ label: 'Sessions', count: sessions });
  const keptRoles = await rolesOf(kept._id);
  const roles = (await rolesOf(removed._id)).filter((r) => !keptRoles.includes(r));
  if (roles.length > 0) moves.push({ label: `Roles (${roles.join(', ')})`, count: roles.length });

  return {
    kept: await accountSummary(kept, keptMember),
    removed: await accountSummary(removed, removedMember),
    emails: mergedEmails(kept, removed),
    logins: [...new Set([
      ...(kept.services?.password || removed.services?.password ? ['password'] : []),
      ...OAUTH.filter((s) => kept.services?.[s] || removed.services?.[s]),
    ])],
    moves,
    members,
    blockers,
    warnings,
  };
};

/**
 * Merge `removedId` into `keptId`, the members too, and remove `removedId`.
 *
 * @param {{keptMemberId?: string, userId?: string}} [options] userId: who
 *   merges, for the audit log (null when the person does it themselves)
 * @return {Promise<object>} the plan that was carried out
 */
export const mergeUsers = async (keptId, removedId, { keptMemberId = null, userId = null } = {}) => {
  const plan = await planUserMerge(keptId, removedId, { keptMemberId, actorId: userId });
  if (plan.blockers.length > 0) throw new Meteor.Error('merge-blocked', plan.blockers.join(' '));

  // The members first: while both accounts still exist, each still finds its own.
  if (plan.members) {
    const dest = await Members.findOneAsync(plan.members.keptMemberId);
    const source = await Members.findOneAsync(plan.members.plan.source._id);
    await mergeMembers(source, dest, { userId, accountsMerged: true });
  }

  const kept = await userOf(keptId, 'kept');
  const removed = await userOf(removedId, 'removed');

  // Emails, logins and sessions are unique across accounts, so R gives them up
  // before K takes them.
  const tokens = (removed.services?.resume?.loginTokens || []).filter((t) => !t.impersonatedBy);
  const takenServices = {};
  if (!kept.services?.password && removed.services?.password) takenServices.password = removed.services.password;
  for (const service of OAUTH) {
    if (!kept.services?.[service] && removed.services?.[service]) takenServices[service] = removed.services[service];
  }
  await Meteor.users.updateAsync(removed._id, {
    $set: { emails: [] },
    $unset: { 'services.resume': '', ...Object.fromEntries(Object.keys(takenServices).map((s) => [`services.${s}`, ''])) },
  });
  await Meteor.users.updateAsync(kept._id, {
    $set: {
      emails: mergedEmails(kept, removed),
      ...Object.fromEntries(Object.entries(takenServices).map(([s, value]) => [`services.${s}`, value])),
      ...(removed.lastSeenAt && (!kept.lastSeenAt || removed.lastSeenAt > kept.lastSeenAt) ? { lastSeenAt: removed.lastSeenAt } : {}),
    },
    ...(tokens.length ? { $push: { 'services.resume.loginTokens': { $each: tokens } } } : {}),
  });

  await PushSubs.updateAsync({ userId: removed._id }, { $set: { userId: kept._id } }, { multi: true });
  for (const { collection, field } of ACTOR_MOVES) {
    await collection.updateAsync({ [field]: removed._id }, { $set: { [field]: kept._id } }, { multi: true });
  }
  const roles = await rolesOf(removed._id);
  for (const role of roles) await Roles.addUsersToRolesAsync(kept._id, role, null);
  await Meteor.roleAssignment.removeAsync({ 'user._id': removed._id });

  await Comments.insertAsync({
    about: kept._id,
    created: new Date(),
    text: `Merged the account ${plan.removed.emails.map((e) => e.address).join(', ') || plan.removed.username} into this one`
      + (plan.members ? `, and member ${plan.members.plan.source.mid} into ${plan.members.plan.dest.mid}` : '')
      + '.',
  });
  await Meteor.users.removeAsync(removed._id);
  await recordChange({
    userId, domain: 'users', action: 'merge', docId: kept._id,
    after: { mergedFrom: removed._id, emails: plan.removed.emails.map((e) => e.address), roles },
  });
  return plan;
};

/** Whether an account has any of the staff roles, which a person may not merge on their own. */
export const hasStaffRole = async (userId) =>
  (await Meteor.roleAssignment.find({ 'user._id': userId, 'role._id': { $in: ADMIN_ROLES } }).countAsync()) > 0;
