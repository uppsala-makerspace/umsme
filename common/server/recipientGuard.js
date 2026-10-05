import { Meteor } from 'meteor/meteor';

/**
 * Who may be contacted at all — by email or push — when a recipient whitelist
 * is configured. Meant for development and staging, where the database is
 * often a copy of production: with a whitelist set, mail and push reach only
 * the listed addresses, whatever the code tries to send and to whom.
 *
 * Configure in settings.json (each app reads its own):
 *   { "private": { "recipientWhitelist": ["me@example.com"] } }
 *
 * - Unset: everyone is allowed. This is what production wants, so production
 *   settings leave the key out.
 * - A list: only those addresses. An empty list means no one at all, a safe
 *   default for a fresh development setup.
 *
 * The older `private.emailWhitelist` is still honoured when recipientWhitelist
 * is unset, with its original meaning: empty or unset allows everyone.
 */
export const recipientWhitelist = () => {
  const list = Meteor.settings?.private?.recipientWhitelist;
  if (Array.isArray(list)) return list.map((address) => String(address).trim().toLowerCase());
  const legacy = Meteor.settings?.private?.emailWhitelist;
  if (Array.isArray(legacy) && legacy.length > 0) {
    return legacy.map((address) => String(address).trim().toLowerCase());
  }
  return null;
};

/** The bare address of "Name <a@b.se>" or "a@b.se", lowercased. */
const bareAddress = (to) => {
  const value = String(to || '');
  const inBrackets = value.includes('<') ? value.match(/<(.+?)>/)?.[1] : value;
  return (inBrackets || '').trim().toLowerCase();
};

/**
 * Whether this address may receive mail or push.
 *
 * @param {string} to - An address, optionally as "Name <address>"
 * @returns {boolean}
 */
export const isRecipientAllowed = (to) => {
  const whitelist = recipientWhitelist();
  if (!whitelist) return true;
  return whitelist.includes(bareAddress(to));
};

/**
 * The push subscriptions that may be used: all of them without a whitelist,
 * otherwise only those of users with a whitelisted email address. A
 * subscription without a user is dropped while a whitelist is active.
 *
 * @param {Array<{userId: string}>} subs - PushSubs documents
 * @returns {Promise<Array>}
 */
export const allowedPushSubscriptions = async (subs) => {
  if (!recipientWhitelist() || subs.length === 0) return subs;
  const userIds = [...new Set(subs.map((s) => s.userId).filter(Boolean))];
  const users = await Meteor.users
    .find({ _id: { $in: userIds } }, { fields: { emails: 1 } })
    .fetchAsync();
  const allowedUserIds = new Set(
    users
      .filter((u) => (u.emails || []).some((e) => isRecipientAllowed(e.address)))
      .map((u) => u._id)
  );
  return subs.filter((s) => allowedUserIds.has(s.userId));
};
