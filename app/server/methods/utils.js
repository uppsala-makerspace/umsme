import { Meteor } from "meteor/meteor";
import { Roles } from "meteor/roles";
import { Members } from "/imports/common/collections/members";
import { Spaces } from "/imports/common/collections/spaces";
import { Groups } from "/imports/common/collections/groups";
import { GroupMemberships } from "/imports/common/collections/groupMemberships";
import { ExpenseAccounts } from "/imports/common/collections/expenseAccounts";
import { memberStatus } from "/imports/common/lib/utils";
import { REVIEWER_ROLES, approvableAccountIds } from "/imports/common/lib/expenseApproval";
import { memberForUser } from "/imports/common/server/memberForUser";
import { spaceIconUrlFor } from "/imports/common/server/workshopImage";

/** The groups the member is an active (approved) member of. */
export const myActiveGroupIds = async (member) => {
  if (!member?._id) return [];
  const memberships = await GroupMemberships.find(
    { memberId: member._id, state: "active" },
    { fields: { groupId: 1 } }
  ).fetchAsync();
  return memberships.map((m) => m.groupId);
};

/**
 * Expense accounts the member may spend on: those belonging to any group the
 * member is an active member of (the guideline: a group's members may make
 * expenses on the group's accounts). Admin/board and allowlisted members are
 * not restricted — see expenseAccountsFor.
 */
export const myGroupExpenseAccounts = async (member) => {
  const groupIds = await myActiveGroupIds(member);
  if (!groupIds.length) return [];
  return ExpenseAccounts.find(
    { groupIds: { $in: groupIds } },
    { sort: { name: 1 } }
  ).fetchAsync();
};

/** Whether the account list should be unrestricted for this user. */
export const seesAllExpenseAccounts = async (member) => {
  const allowList = Meteor.settings?.private?.expenses?.allowList;
  if (member?.email && allowList?.length && allowList.includes(member.email)) return true;
  const userId = Meteor.userId();
  return !!userId && (await Roles.userIsInRoleAsync(userId, ["admin", "board"]));
};

/**
 * The expense accounts this member may pick when submitting an expense.
 * Allowlisted members and admin/board see every account; everyone else is
 * limited to the accounts of their groups.
 */
export const expenseAccountsFor = async (member) => {
  if (await seesAllExpenseAccounts(member)) {
    return ExpenseAccounts.find({}, { sort: { name: 1 } }).fetchAsync();
  }
  return myGroupExpenseAccounts(member);
};

/** Whether the user holds a role that may review every expense. */
const hasReviewerRole = async () => {
  const userId = Meteor.userId();
  return !!userId && (await Roles.userIsInRoleAsync(userId, REVIEWER_ROLES));
};

/**
 * The expense accounts whose expenses this member may review, i.e. approve or
 * reject. Distinct from expenseAccountsFor, which is about *spending*: being in
 * an account's owning group grants no review rights, only `approverMemberIds`
 * (or one of the reviewer roles) does.
 *
 * @return {Promise<Array<string>>} account ids
 */
export const approvableAccountIdsFor = async (member) => {
  if (!member?._id) return [];
  const accounts = await ExpenseAccounts.find({}, { fields: { approverMemberIds: 1 } }).fetchAsync();
  return approvableAccountIds(accounts, member._id, await hasReviewerRole());
};

/** Whether this member may review anyone's expenses at all. */
export const canApproveExpenses = async (member) =>
  (await approvableAccountIdsFor(member)).length > 0;

/**
 * Whether the current user may see/use the expenses feature: their member
 * email is on the configured allowlist, their account is in the admin/board
 * group (always allowed), they are an active member of a group that has at
 * least one expense account, or they are an appointed approver — an approver
 * with no group accounts of their own still needs to reach their review list.
 */
export const expenseAccessAllowed = async (member) => {
  if (await seesAllExpenseAccounts(member)) return true;
  if ((await myGroupExpenseAccounts(member)).length > 0) return true;
  return canApproveExpenses(member);
};

/**
 * Character mappings for accented characters not in the Swedish alphabet.
 * Swedish å, ä, ö are preserved as they are allowed in Swish messages.
 */
const accentMap = {
  // Lowercase
  'à': 'a', 'á': 'a', 'â': 'a', 'ã': 'a', 'ā': 'a', 'ă': 'a', 'ą': 'a',
  'ç': 'c', 'ć': 'c', 'č': 'c',
  'ď': 'd', 'đ': 'd',
  'è': 'e', 'é': 'e', 'ê': 'e', 'ë': 'e', 'ē': 'e', 'ė': 'e', 'ę': 'e', 'ě': 'e',
  'ğ': 'g', 'ģ': 'g',
  'ì': 'i', 'í': 'i', 'î': 'i', 'ï': 'i', 'ī': 'i', 'į': 'i',
  'ķ': 'k',
  'ļ': 'l', 'ł': 'l',
  'ñ': 'n', 'ń': 'n', 'ņ': 'n', 'ň': 'n',
  'ò': 'o', 'ó': 'o', 'ô': 'o', 'õ': 'o', 'ø': 'o', 'ō': 'o', 'ő': 'o',
  'ŕ': 'r', 'ř': 'r',
  'ś': 's', 'ş': 's', 'š': 's',
  'ţ': 't', 'ť': 't',
  'ù': 'u', 'ú': 'u', 'û': 'u', 'ū': 'u', 'ů': 'u', 'ű': 'u', 'ų': 'u',
  'ý': 'y', 'ÿ': 'y',
  'ź': 'z', 'ż': 'z', 'ž': 'z',
  'æ': 'ae', 'œ': 'oe', 'ß': 'ss',
  // Uppercase
  'À': 'A', 'Á': 'A', 'Â': 'A', 'Ã': 'A', 'Ā': 'A', 'Ă': 'A', 'Ą': 'A',
  'Ç': 'C', 'Ć': 'C', 'Č': 'C',
  'Ď': 'D', 'Đ': 'D',
  'È': 'E', 'É': 'E', 'Ê': 'E', 'Ë': 'E', 'Ē': 'E', 'Ė': 'E', 'Ę': 'E', 'Ě': 'E',
  'Ğ': 'G', 'Ģ': 'G',
  'Ì': 'I', 'Í': 'I', 'Î': 'I', 'Ï': 'I', 'Ī': 'I', 'Į': 'I',
  'Ķ': 'K',
  'Ļ': 'L', 'Ł': 'L',
  'Ñ': 'N', 'Ń': 'N', 'Ņ': 'N', 'Ň': 'N',
  'Ò': 'O', 'Ó': 'O', 'Ô': 'O', 'Õ': 'O', 'Ø': 'O', 'Ō': 'O', 'Ő': 'O',
  'Ŕ': 'R', 'Ř': 'R',
  'Ś': 'S', 'Ş': 'S', 'Š': 'S',
  'Ţ': 'T', 'Ť': 'T',
  'Ù': 'U', 'Ú': 'U', 'Û': 'U', 'Ū': 'U', 'Ů': 'U', 'Ű': 'U', 'Ų': 'U',
  'Ý': 'Y', 'Ÿ': 'Y',
  'Ź': 'Z', 'Ż': 'Z', 'Ž': 'Z',
  'Æ': 'AE', 'Œ': 'OE',
};

/**
 * Sanitize a string for use in Swish payment messages.
 *
 * Swish allows: letters a-ö, A-Ö, numbers 0-9, and special characters :;.,?!()"-
 * This function:
 * 1. Replaces accented characters (except Swedish å, ä, ö) with their base forms
 * 2. Removes any remaining disallowed characters
 *
 * @param {string} str - The string to sanitize
 * @returns {string} - The sanitized string safe for Swish messages
 */
export const sanitizeForSwish = (str) => {
  if (!str) return '';

  // Replace known accented characters with their base forms
  let result = '';
  for (const char of str) {
    if (accentMap[char]) {
      result += accentMap[char];
    } else {
      result += char;
    }
  }

  // Remove any characters not allowed by Swish
  // Allowed: a-z, A-Z, å, ä, ö, Å, Ä, Ö, 0-9, space, :;.,?!()"-
  result = result.replace(/[^a-zA-ZåäöÅÄÖ0-9 :;.,?!()"-]/g, '');

  return result.substring(0, 50);
};

/**
 * Gets the lab end date for a member, handling family memberships.
 * @param {object} member - The member object
 * @returns {Promise<Date|null>} The lab end date or null if not found
 */
export const getLabEndForMember = async (member) => {
  if (!member) return null;

  // Get the paying member for family memberships
  const paying = member.infamily
    ? await Members.findOneAsync(member.infamily)
    : member;

  const status = await memberStatus(paying);
  return status.labEnd || null;
};

/**
 * Checks if the member has an active lab membership.
 * @param {object} member - The member object
 * @returns {Promise<boolean>}
 */
export const hasActiveLabMembership = async (member) => {
  const labEnd = await getLabEndForMember(member);
  return labEnd !== null && labEnd > new Date();
};

/**
 * Checks if a member is registered (formally accepted).
 * For family members, checks the paying member's registration status.
 * @param {object} member - The member object
 * @returns {Promise<boolean>}
 */
export const isMemberRegistered = async (member) => {
  if (!member) return false;
  const paying = member.infamily
    ? await Members.findOneAsync(member.infamily)
    : member;
  return !!paying?.registered;
};

/**
 * Checks if a member is an active makerspace member: not excluded, formally
 * accepted (registered), and holding a current paid base or lab membership.
 * For family members, resolves via the paying member. Used to gate access to
 * other members' data (e.g. group member lists).
 * @param {object} member - The member object
 * @returns {Promise<boolean>}
 */
export const isActiveMember = async (member) => {
  if (!member || member.excluded) return false;
  if (!(await isMemberRegistered(member))) return false;
  const paying = member.infamily
    ? await Members.findOneAsync(member.infamily)
    : member;
  const { type } = await memberStatus(paying);
  return !!type && type !== "none";
};

export const findForUser = async () => {
  let user;
  let email;
  let verified;
  let member;
  if (Meteor.userId()) {
    user = await Meteor.userAsync();
    const firstEmail = user?.emails?.[0];
    const firstService = user?.service?.[0];
    if (firstEmail) {
      email = firstEmail?.address?.toLowerCase();
      verified = firstEmail.verified;
    } else if (firstService) {
      email = firstService.email?.toLowerCase();
      verified = true;
    }
    // Resolve the member by matching ANY verified email, not just emails[0].
    member = await memberForUser(user);
  }
  return {user, email, verified, member};
};

export const findMemberForUser = async () => {
  const { member } = await findForUser();
  return member;
};

/**
 * Whether the member is the responsible (gruppansvarig) of a group. Basis for
 * the group-responsible editing methods (a group's responsible may edit its
 * descriptive fields, no admin role required).
 */
export const isGroupResponsible = (member, group) =>
  !!member && !!group && group.responsibleMemberId === member._id;

/**
 * Whether the member may edit a workshop: only the responsible of the
 * workshop's own group (steering groups link to a workshop via groupId).
 * Responsibility subgroups' responsibles do not edit the workshop.
 */
export const isWorkshopResponsible = async (member, workshop) => {
  if (!member || !workshop?.groupId) return false;
  const group = await Groups.findOneAsync(workshop.groupId);
  return isGroupResponsible(member, group);
};

/**
 * Apply a whitelisted update: $set non-empty values, $unset empty ones (so
 * optional fields can be cleared), skipping undefined values entirely. Keys
 * may be dotted (e.g. "description.sv"). The caller decides the whitelist —
 * never pass a client-supplied object straight through.
 */
export const applyWhitelistedUpdate = async (collection, id, fields) => {
  const $set = {};
  const $unset = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    if (value === null || value === "") $unset[key] = "";
    else $set[key] = value;
  }
  const modifier = {};
  if (Object.keys($set).length) modifier.$set = $set;
  if (Object.keys($unset).length) modifier.$unset = $unset;
  if (Object.keys(modifier).length) await collection.updateAsync(id, modifier);
};

/**
 * Mini-map data for an entity (workshop or group) linked to spaces via
 * primarySpaceId/secondarySpaceIds: every linked space with its map key,
 * floor and icon, primary first, in the stored secondary order. The mini map
 * starts on the primary space's floor (`floor`) and can switch floors. The
 * client assigns each space its color, shared between the icon card and the
 * map fill. Null when the entity has no primary space.
 */
export const spacesMapView = async (entity) => {
  if (!entity.primarySpaceId) return null;
  const primary = await Spaces.findOneAsync(entity.primarySpaceId);
  if (!primary) return null;
  const secondaryDocs = await Spaces.find({
    _id: { $in: entity.secondarySpaceIds || [] },
  }).fetchAsync();
  const byId = new Map(secondaryDocs.map((s) => [s._id, s]));
  const secondaries = (entity.secondarySpaceIds || [])
    .map((id) => byId.get(id))
    .filter(Boolean);
  return {
    floor: primary.floor,
    primarySpaceId: primary.spaceId,
    spaces: [primary, ...secondaries].map((s) => ({
      spaceId: s.spaceId,
      floor: s.floor,
      iconUrl: spaceIconUrlFor(s),
    })),
  };
};
