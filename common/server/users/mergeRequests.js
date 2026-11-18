import crypto from 'crypto';
import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { AccountMergeRequests } from '/imports/common/collections/accountMergeRequests';
import { normalizeEmail } from '/imports/common/lib/memberMatch';
import { recordChange } from '/imports/common/server/auditLog';
import { planUserMerge, mergeUsers, hasStaffRole } from './merge';

/**
 * A member's request to merge another account into their own: a token for a
 * link mailed to the other account's address (the app mails it). Opening the
 * link proves that mailbox, as a password reset to it would, so confirming it
 * merges the accounts, and their members, on that proof alone. Only the plain
 * case: anything to weigh (a staff role, family, storage, two Google
 * accounts) is left to us.
 *
 * The token is stored hashed, works once and for a day, and only for the two
 * accounts it was made for.
 */

export const MERGE_TTL_MS = 24 * 60 * 60 * 1000;
export const MAX_MERGE_REQUESTS_PER_HOUR = 5;

const hash = (token) => Accounts._hashLoginToken(token);
const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const hasAddress = (user, address) => (user?.emails || []).some((e) => normalizeEmail(e.address) === normalizeEmail(address));

/** The account that has an address, whatever its case. */
export const userByAddress = (address) =>
  Meteor.users.findOneAsync({ 'emails.address': { $regex: `^${escape(normalizeEmail(address))}$`, $options: 'i' } });

/**
 * Why merging `other` into `user` is not for the member alone to do (none:
 * it may go ahead), and the plan. Each reason has a `code` the app explains:
 * staffRole (an account has a role in the association), oauthConflict (two
 * different Google or Facebook accounts), adminLogin, or members (merging the
 * members is blocked: family, storage), with `details` from the member merge.
 */
export const automaticMerge = async (user, other) => {
  const reasons = [];
  if (await hasStaffRole(user._id) || await hasStaffRole(other._id)) reasons.push({ code: 'staffRole' });
  const plan = await planUserMerge(user._id, other._id);
  const memberBlockers = plan.members?.plan.blockers || [];
  const accountBlockers = plan.blockers.filter((b) => !memberBlockers.includes(b));
  const codeOf = (blocker) => (/sign in with different/.test(blocker) ? 'oauthConflict'
    : /admin login/.test(blocker) ? 'adminLogin' : 'other');
  for (const code of new Set(accountBlockers.map(codeOf))) {
    reasons.push(code === 'other' ? { code, details: accountBlockers.filter((b) => codeOf(b) === 'other') } : { code });
  }
  if (memberBlockers.length) reasons.push({ code: 'members', details: memberBlockers });
  return { plan, reasons };
};

/**
 * Ask to merge the account with `address` into `user`.
 *
 * @return {Promise<{token: string, address: string}>} the token for the link
 */
export const createMergeRequest = async (user, address, { now = new Date() } = {}) => {
  const normalized = normalizeEmail(address);
  const other = await userByAddress(normalized);
  if (!other || other._id === user._id) throw new Meteor.Error('not-found', 'No other account has this address');
  const recent = await AccountMergeRequests.find({
    fromUserId: user._id, createdAt: { $gt: new Date(now.getTime() - 60 * 60 * 1000) },
  }).countAsync();
  if (recent >= MAX_MERGE_REQUESTS_PER_HOUR) throw new Meteor.Error('too-many', 'Too many requests; try again in an hour');
  const token = crypto.randomBytes(32).toString('base64url');
  await AccountMergeRequests.insertAsync({
    fromUserId: user._id, toUserId: other._id, address: normalized,
    tokenHash: hash(token), createdAt: now, expiresAt: new Date(now.getTime() + MERGE_TTL_MS),
  });
  return { token, address: normalized };
};

// The request a token is for, and its two accounts, while it may be used.
const usable = async (token, now) => {
  const request = await AccountMergeRequests.findOneAsync({ tokenHash: hash(token) });
  if (!request) return { state: 'invalid' };
  if (request.usedAt) return { state: 'used' };
  if (request.expiresAt < now) return { state: 'expired' };
  const user = await Meteor.users.findOneAsync(request.fromUserId);
  const other = await Meteor.users.findOneAsync(request.toUserId);
  // The address may have left the other account since.
  if (!user || !other || !hasAddress(other, request.address)) return { state: 'invalid' };
  return { state: 'ok', request, user, other };
};

/** What a merge link would do, for the page it opens. */
export const mergeRequestInfo = async (token, { now = new Date() } = {}) => {
  const { state, request, user, other } = await usable(token, now);
  if (state !== 'ok') return { state };
  const { plan, reasons } = await automaticMerge(user, other);
  const member = plan.members ? plan.members.plan.dest : (plan.kept.member || plan.removed.member);
  return {
    state: reasons.length ? 'needsHelp' : 'ready',
    reasons,
    kept: user.emails?.[0]?.address || null,
    removed: request.address,
    member: member ? { name: member.name, mid: member.mid } : null,
  };
};

/**
 * Merge as the link asked: the other account into the requesting one, and
 * their members (the one with memberships kept). The token is spent either
 * way; a merge with anything to weigh is not done but noted for us.
 *
 * @return {Promise<{merged: boolean, reasons?: string[], kept?: string, removed?: string}>}
 */
export const confirmMergeRequest = async (token, { now = new Date() } = {}) => {
  const { state, request, user, other } = await usable(token, now);
  if (state !== 'ok') throw new Meteor.Error('bad-token', 'The link is not valid any longer');
  // Only once, even if confirmed twice at the same moment.
  const claimed = await AccountMergeRequests.updateAsync(
    { _id: request._id, usedAt: { $exists: false } },
    { $set: { usedAt: now } },
  );
  if (claimed !== 1) throw new Meteor.Error('bad-token', 'The link is not valid any longer');

  const { reasons } = await automaticMerge(user, other);
  if (reasons.length) {
    await AccountMergeRequests.updateAsync(request._id, { $set: { outcome: 'needsHelp', reasons } });
    await recordChange({
      userId: null, domain: 'users', action: 'mergeRequestBlocked', docId: user._id,
      after: { otherUserId: other._id, address: request.address, reasons },
    });
    return { merged: false, reasons };
  }
  const kept = user.emails?.[0]?.address || null;
  await mergeUsers(user._id, other._id, { userId: null });
  await AccountMergeRequests.updateAsync(request._id, { $set: { outcome: 'merged' } });
  return { merged: true, kept, removed: request.address };
};
