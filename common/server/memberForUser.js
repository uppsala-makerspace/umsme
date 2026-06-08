import { Members } from '/imports/common/collections/members';
import { normalizedEmails } from '/imports/common/lib/memberMatch';

/**
 * Resolve the Member record for a logged-in user account.
 *
 * The link between an account and a Member is reconstructed by matching the
 * account's *verified* email addresses against `Members.email` (stored
 * lowercased). All verified addresses are considered — not just `emails[0]` —
 * so a member whose primary login address differs from, or is listed after,
 * their member email is still resolved.
 *
 * Returns null when no verified email matches a Member (e.g. the bare `admin`
 * login, which has no email and therefore no member). Callers must treat null
 * as "could not identify a member" rather than assuming a specific identity.
 */
export const memberForUser = async (user) => {
  const emails = normalizedEmails(user, { verifiedOnly: true });
  if (emails.length === 0) return null;
  return Members.findOneAsync({ email: { $in: emails } });
};
