import { Meteor } from 'meteor/meteor';
import { verifiedUserSelectorForMember } from '/imports/common/lib/memberMatch';

/**
 * When a user was last in the member app: `lastSeenAt` on the user account,
 * written by the app only (never by admin), at most every 15 minutes.
 */

export const LAST_SEEN_RESOLUTION_MS = 15 * 60 * 1000;

/**
 * Record that the user is in the app: lastSeenAt = now, in one atomic update,
 * unless it was set less than 15 minutes ago, or the connection is logged in
 * with a switch-user token (an admin viewing the app as this user, see
 * app/server/impersonation).
 *
 * @param {string} userId
 * @param {{ hashedToken?: string, now?: Date }} options  hashedToken: the
 *   connection's login token, hashed; a token marked `impersonatedBy` skips.
 * @returns {Promise<number>} 1 when written, 0 when skipped
 */
export const touchLastSeen = async (userId, { hashedToken, now = new Date() } = {}) => {
  if (!userId) return 0;
  const cutoff = new Date(now.getTime() - LAST_SEEN_RESOLUTION_MS);
  return Meteor.users.updateAsync(
    {
      _id: userId,
      $or: [{ lastSeenAt: { $exists: false } }, { lastSeenAt: { $lt: cutoff } }],
      ...(hashedToken ? {
        'services.resume.loginTokens': {
          $not: { $elemMatch: { hashedToken, impersonatedBy: { $exists: true } } },
        },
      } : {}),
    },
    { $set: { lastSeenAt: now } },
  );
};

/**
 * The member's use of the app: whether they have an account (by verified
 * email, the link memberForUser follows the other way) and when it was last
 * in the app. With several accounts, the latest wins.
 *
 * @param {{ email?: string }} member
 * @returns {Promise<{ hasAccount: boolean, lastSeenAt: Date|null }>}
 */
export const memberAppActivity = async (member) => {
  if (!member?.email) return { hasAccount: false, lastSeenAt: null };
  const users = await Meteor.users.find(verifiedUserSelectorForMember(member), {
    fields: { lastSeenAt: 1 },
  }).fetchAsync();
  const lastSeenAt = users
    .map((u) => u.lastSeenAt)
    .filter(Boolean)
    .sort((a, b) => b - a)[0] || null;
  return { hasAccount: users.length > 0, lastSeenAt };
};
