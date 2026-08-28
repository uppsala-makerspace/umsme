/**
 * Whether a member's own memberships grant family status.
 *
 * The membership with the latest `memberend` controls the member's dates, and
 * the family flag used to be read off that same document. A family add-on is
 * bought alongside an existing base membership and extends nothing, so it
 * carries the *same* `memberend` — which left the answer to whichever document
 * Mongo happened to return first. Members who had paid for a family add-on were
 * silently reverted to non-family every time updateMember ran.
 *
 * So: the latest end date decides which memberships are in play, and a family
 * flag on any of them wins. A downgrade renewal is unaffected — it always has a
 * strictly later end date, so it alone is in play and its `false` stands.
 *
 * Memberships without a `memberend` (a bare quarterly lab) do not carry family
 * status, matching memberStatus, which only consults them for lab dates.
 *
 * @param {Array<{memberend: Date, family: boolean}>} memberships one member's own memberships
 * @return {boolean}
 */
export const familyFromMemberships = (memberships) => {
  let latest = null;
  for (const ms of memberships) {
    if (!ms.memberend) continue;
    if (!latest || ms.memberend > latest) latest = ms.memberend;
  }
  if (!latest) return false;
  return memberships.some(
    (ms) =>
      ms.memberend &&
      ms.memberend.getTime() === latest.getTime() &&
      ms.family === true,
  );
};
