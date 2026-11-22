/**
 * Pure (client + server safe) business rules for groups (grupper) and
 * workshops (verkstäder), per the workshops-and-groups guideline. Areas
 * of interest (intresseområden) are a kind of workshop: same collection, same
 * steering-group link, lighter requirements.
 *
 * Completeness mirrors the guideline's checklists: entities can be drafted
 * incrementally in admin (the schemas only require a Swedish name and type),
 * and these functions decide where an incomplete entity may appear. Public
 * visibility (the future website) is DERIVED from type/status + completeness
 * rather than stored, so it can never drift.
 */

export const GROUP_TYPES = ["steering", "function", "responsibility"];
export const WORKSHOP_KINDS = ["workshop", "areaOfInterest"];
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
 * Whether a group is looking for members or is full, from the limits it has
 * set: "seeking" below minMembers, "full" at maxMembers or more, otherwise
 * null. Only shown; joining is not refused.
 *
 * @param {{minMembers?: number, maxMembers?: number}} group
 * @param {number} memberCount its active members
 * @return {"seeking"|"full"|null}
 */
export const staffingOf = (group, memberCount) => {
  if (group?.maxMembers && memberCount >= group.maxMembers) return "full";
  if (group?.minMembers && memberCount < group.minMembers) return "seeking";
  return null;
};

/**
 * The member limits as given in a form, checked: whole numbers of at least
 * one, the upper not below the lower. Null for a limit left empty.
 *
 * @return {{minMembers: number|null, maxMembers: number|null, error: string|null}}
 */
export const memberLimits = (minMembers, maxMembers) => {
  const read = (value) => (value === undefined || value === null || value === "" ? null : Number(value));
  const min = read(minMembers);
  const max = read(maxMembers);
  for (const value of [min, max]) {
    if (value !== null && (!Number.isInteger(value) || value < 1)) {
      return { minMembers: min, maxMembers: max, error: "The member limits must be whole numbers of at least 1" };
    }
  }
  if (min !== null && max !== null && max < min) {
    return { minMembers: min, maxMembers: max, error: "The upper member limit cannot be below the lower one" };
  }
  return { minMembers: min, maxMembers: max, error: null };
};

/**
 * Whether a member may edit a group's descriptive fields — and, for a steering
 * group, its workshop's.
 *
 * A steering group is run collectively, so everyone in it maintains the
 * information. Every other kind of group keeps this with its responsible. What
 * may be changed is unaffected: description, rules, Slack channel, guides link
 * and image, never name, status, spaces or who is responsible.
 *
 * A pending request is not membership. The admin role may edit every group,
 * without being in it (not board).
 *
 * @param {{isAdmin?: boolean, isResponsible: boolean, groupType: string, membershipState: string|null}} args
 */
export const mayEditGroup = ({ isAdmin = false, isResponsible, groupType, membershipState }) =>
  !!isAdmin || !!isResponsible || (groupType === "steering" && membershipState === "active");

/**
 * Whether a member approves a group's join requests by what they are in it,
 * leaving aside the admin and board roles: its responsible where only they
 * approve ("request-responsible"), any active member where every member does
 * ("request-any", or none set); as canApprove has it. The basis
 * for the red marks on the home page and the group cards, which count the
 * requests of request-* groups only; who may approve is canApprove in
 * app/server/methods/groups.js, which also asks for an active membership.
 *
 * @param {{joinPolicy: string, isResponsible: boolean, membershipState: string|null}} args
 */
export const mayApproveAsMember = ({ joinPolicy, isResponsible, membershipState }) =>
  joinPolicy === "request-responsible" ? !!isResponsible
    : joinPolicy !== "open" && membershipState === "active";

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

// A workshop document without a kind predates the field and is a workshop.
export const isAreaOfInterest = (workshop) => workshop?.kind === "areaOfInterest";

/**
 * Guideline requirements on a workshop: a name ending in "verkstad" or
 * "verkstaden" (definite form), a description, a representative image, a
 * Slack channel, and a responsible steering group with at least two active
 * members.
 *
 * An area of interest is lighter: it occupies no space of its own to keep in
 * order, so one active member in its steering group is enough, and its name is
 * free.
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
  } else if (activeMemberCount < (isAreaOfInterest(workshop) ? 1 : 2)) {
    missing.push("groupMembers");
  }
  if (
    !isAreaOfInterest(workshop) &&
    workshop?.name?.sv &&
    !/verkstad(en)?$/i.test(workshop.name.sv.trim())
  ) {
    warnings.push("nameSuffix");
  }
  return { complete: missing.length === 0, missing, warnings };
};

// Website visibility: established and trial workshops and areas of interest
// only, and only once complete. Forming/decommissioned ones are
// app/admin-internal.
export const isWorkshopPublic = (workshop, group, activeMemberCount = 0) =>
  ["established", "trial"].includes(workshop?.status) &&
  workshopCompleteness(workshop, group, activeMemberCount).complete;
