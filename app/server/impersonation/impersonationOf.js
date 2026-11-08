import { Meteor } from "meteor/meteor";
import { Accounts } from "meteor/accounts-base";
import { Roles } from "meteor/roles";

/**
 * "Switch user": the account named `admin` may log in to the app as another
 * user, to see the app exactly as that user does. It works by minting an
 * ordinary resume token for the target user, marked with `impersonatedBy`, so
 * everything keyed on the logged-in user — roles, member lookup, push, storage
 * — behaves as for the target. While such a token is in use the app is
 * read-only (see readOnly.js).
 */

/** The only account that may switch user. */
export const IMPERSONATOR_USERNAME = "admin";

/** How long a switch lasts before the token is refused. */
export const IMPERSONATION_MAX_AGE_MS = 2 * 60 * 60 * 1000;

/**
 * Whether the user may switch to another user. The username decides; the
 * admin role is required as well, so that a stray account that somehow got the
 * name `admin` gets nothing.
 */
export const mayImpersonate = async (user) =>
  !!user &&
  user.username === IMPERSONATOR_USERNAME &&
  (await Roles.userIsInRoleAsync(user._id, "admin"));

export const isExpired = (startedAt, now = Date.now()) =>
  !startedAt || now - new Date(startedAt).getTime() > IMPERSONATION_MAX_AGE_MS;

/**
 * The switch-user marking of a stored (hashed) login token, or null when the
 * token is an ordinary one.
 */
export const impersonationOfToken = async (userId, hashedToken) => {
  if (!userId || !hashedToken) return null;
  const user = await Meteor.users.findOneAsync(
    {
      _id: userId,
      "services.resume.loginTokens": {
        $elemMatch: { hashedToken, impersonatedBy: { $exists: true } },
      },
    },
    { fields: { "services.resume.loginTokens.$": 1 } }
  );
  const token = user?.services?.resume?.loginTokens?.[0];
  if (!token) return null;
  return {
    adminUserId: token.impersonatedBy,
    startedAt: token.impersonationStartedAt,
  };
};

// connection.id -> { userId, hashedToken, result }. A connection's login can
// change (switch, switch back), so an entry is only reused for the same user
// and token.
const cache = new Map();

/**
 * Whether the connection is logged in through a switch-user token. Returns
 * `{ adminUserId, startedAt }` or null.
 */
export const impersonationOf = async (connection, userId) => {
  if (!connection || !userId) return null;
  const hashedToken = Accounts._getLoginToken(connection.id);
  if (!hashedToken) return null;

  const cached = cache.get(connection.id);
  if (cached && cached.userId === userId && cached.hashedToken === hashedToken) {
    return cached.result;
  }

  const result = await impersonationOfToken(userId, hashedToken);
  if (!cached) connection.onClose(() => cache.delete(connection.id));
  cache.set(connection.id, { userId, hashedToken, result });
  return result;
};
