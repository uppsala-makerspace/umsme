/**
 * Pure (client + server safe) helpers for linking a login account to a Member.
 *
 * `Members.email` is stored lowercased, but a user account's email addresses
 * keep whatever case was entered. These helpers normalise on both sides so the
 * account <-> member relationship is matched case-insensitively and against
 * every email on the account, not just `emails[0]`.
 */

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Lowercased, trimmed email addresses on a user account. Pass verifiedOnly to
// restrict to verified addresses (used for identity/security decisions).
export const normalizedEmails = (user, { verifiedOnly = false } = {}) =>
  (user?.emails || [])
    .filter((e) => e && e.address && (!verifiedOnly || e.verified))
    .map((e) => e.address.toLowerCase().trim());

// Mongo selector matching the Member for a user account by any of its emails.
// Returns a never-matching selector when the account has no usable email.
export const memberSelectorForUser = (user, opts) => {
  const emails = normalizedEmails(user, opts);
  if (emails.length === 0) return { _id: { $in: [] } };
  return { email: { $in: emails } };
};

// Mongo selector matching the user account whose emails contain a member's
// (lowercased) email, case-insensitively. Returns a never-matching selector
// when the member has no email.
export const userSelectorForMember = (member) => {
  if (!member?.email) return { _id: { $in: [] } };
  return { "emails.address": { $regex: `^${escapeRegExp(member.email)}$`, $options: "i" } };
};
