/**
 * Pure (client + server safe) business rules for groups (grupper) and
 * workshops (verkstäder), per the workshops-and-groups guideline.
 *
 * Completeness mirrors the guideline's checklists: entities can be drafted
 * incrementally in admin (the schemas only require a Swedish name and type),
 * and these functions decide where an incomplete entity may appear. Public
 * visibility (the future website) is DERIVED from type/status + completeness
 * rather than stored, so it can never drift.
 */

export const GROUP_TYPES = ["steering", "function", "interest", "responsibility"];
export const WORKSHOP_STATUSES = ["established", "trial", "forming", "decommissioned"];
export const JOIN_POLICIES = ["open", "request-any", "request-responsible"];

/**
 * Whether members may ask to join this group on their own.
 *
 * A steering group is closed: its members are added by someone who already has
 * the authority to approve, in person and by member number. Who that is remains
 * the group's joinPolicy — this only removes the self-service route.
 *
 * Tested against `!== false` on purpose: groups created before the field existed
 * have no value for it and must stay open to requests.
 */
export const canRequestToJoin = (group) => group?.allowJoinRequests !== false;

/**
 * Whether a member may edit a group's descriptive fields — and, for a steering
 * group, its workshop's.
 *
 * A steering group is run collectively, so everyone in it maintains the
 * information. Every other kind of group keeps this with its responsible. What
 * may be changed is unaffected: description, rules, Slack channel, guides link
 * and image, never name, status, spaces or who is responsible.
 *
 * A pending request is not membership.
 *
 * @param {{isResponsible: boolean, groupType: string, membershipState: string|null}} args
 */
export const mayEditGroup = ({ isResponsible, groupType, membershipState }) =>
  !!isResponsible || (groupType === "steering" && membershipState === "active");

// Localised field access with Swedish fallback: {sv, en} -> string.
export const localized = (field, lang) =>
  (field && (field[lang] || field.sv)) || "";

/**
 * Guideline requirements on every group: short name, thorough description,
 * Slack channel, and a group responsible (gruppansvarig). Responsibility
 * groups additionally need their parent steering group.
 *
 * @returns {{complete: boolean, missing: string[]}} missing holds field keys.
 */
export const groupCompleteness = (group) => {
  const missing = [];
  if (!group?.name?.sv) missing.push("name");
  if (!group?.description?.sv) missing.push("description");
  if (!group?.type) missing.push("type");
  if (!group?.slackChannel) missing.push("slackChannel");
  if (!group?.responsibleMemberId) missing.push("responsibleMemberId");
  if (group?.type === "responsibility" && !group?.parentGroupId) {
    missing.push("parentGroupId");
  }
  return { complete: missing.length === 0, missing };
};

/**
 * Guideline requirements on a workshop: a name ending in "verkstad" or
 * "verkstaden" (definite form), a description, a representative image, a
 * Slack channel, and a responsible steering group with at least two active
 * members.
 *
 * @param {object} workshop
 * @param {object|null} group  The linked responsible group (or null).
 * @param {number} activeMemberCount  Active members of that group.
 * @returns {{complete: boolean, missing: string[], warnings: string[]}}
 *   The name suffix is a warning, not a completeness blocker.
 */
export const workshopCompleteness = (workshop, group, activeMemberCount = 0) => {
  const missing = [];
  const warnings = [];
  if (!workshop?.name?.sv) missing.push("name");
  if (!workshop?.description?.sv) missing.push("description");
  if (!workshop?.imageFileId) missing.push("image");
  if (!workshop?.slackChannel) missing.push("slackChannel");
  if (!workshop?.groupId || !group) {
    missing.push("groupId");
  } else if (activeMemberCount < 2) {
    missing.push("groupMembers");
  }
  if (workshop?.name?.sv && !/verkstad(en)?$/i.test(workshop.name.sv.trim())) {
    warnings.push("nameSuffix");
  }
  return { complete: missing.length === 0, missing, warnings };
};

// Website visibility: established and trial workshops only, and only once
// complete. Forming/decommissioned workshops are app/admin-internal.
export const isWorkshopPublic = (workshop, group, activeMemberCount = 0) =>
  ["established", "trial"].includes(workshop?.status) &&
  workshopCompleteness(workshop, group, activeMemberCount).complete;

// Website visibility: only interest groups are presented on the website —
// steering groups are represented through their workshop, and function and
// responsibility groups are app-internal.
export const isGroupPublic = (group) =>
  group?.type === "interest" && groupCompleteness(group).complete;
