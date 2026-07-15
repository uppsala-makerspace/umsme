import { Meteor } from "meteor/meteor";
import { Roles } from "meteor/roles";
import { Groups } from "/imports/common/collections/groups";
import { GroupMemberships } from "/imports/common/collections/groupMemberships";
import { Members } from "/imports/common/collections/members";
import { verifiedUserSelectorForMember } from "/imports/common/lib/memberMatch";
import { memberForUser } from "./memberForUser";

/**
 * Keeps a Meteor role in sync with a group's active membership.
 *
 * A group with `linkedRole` set (e.g. the board group linked to the `board`
 * role) is the source of truth for that role: active group members with a
 * verified user account hold it, everyone else loses it. Manual role edits
 * are overwritten by the next sync, so linked roles are administered through
 * group membership only.
 *
 * The `admin` role is never touched (it is bootstrap-managed and its bearer
 * has no member record), and only the group's CURRENT linkedRole is managed —
 * unlinking or relinking a role stops managing the old one without revoking
 * anything.
 *
 * Members without a user account simply aren't granted the role yet;
 * `syncLinkedRolesForUser` runs from the app's onLogin hook and picks them up
 * once they log in with a verified email.
 */

// User ids of the group's active members that have a verified user account.
const linkedUserIds = async (groupId) => {
  const memberIds = (
    await GroupMemberships.find({ groupId, state: "active" }).fetchAsync()
  ).map((m) => m.memberId);
  if (memberIds.length === 0) return [];
  const members = await Members.find({ _id: { $in: memberIds } }).fetchAsync();
  const userIds = [];
  for (const member of members) {
    const user = await Meteor.users.findOneAsync(verifiedUserSelectorForMember(member));
    if (user) userIds.push(user._id);
  }
  return userIds;
};

export const syncLinkedRole = async (group) => {
  const role = group?.linkedRole;
  if (!role || role === "admin") return;

  await Roles.createRoleAsync(role, { unlessExists: true });

  const desired = new Set(await linkedUserIds(group._id));
  const holdersCursor = await Roles.getUsersInRoleAsync(role);
  const current = new Set((await holdersCursor.fetchAsync()).map((u) => u._id));

  const toAdd = [...desired].filter((id) => !current.has(id));
  const toRemove = [...current].filter((id) => !desired.has(id));
  if (toAdd.length > 0) await Roles.addUsersToRolesAsync(toAdd, role);
  if (toRemove.length > 0) await Roles.removeUsersFromRolesAsync(toRemove, role);
};

export const syncLinkedRoleById = async (groupId) => {
  const group = await Groups.findOneAsync(groupId);
  if (group) await syncLinkedRole(group);
};

// Grant-only catch-up for one user, run at login: a member may have been
// approved into role-linked groups before their account existed or their
// email was verified. Revocations are handled by the full syncs above.
export const syncLinkedRolesForUser = async (user) => {
  const member = await memberForUser(user);
  if (!member) return;
  const memberships = await GroupMemberships.find({
    memberId: member._id,
    state: "active",
  }).fetchAsync();
  if (memberships.length === 0) return;
  const groups = await Groups.find({
    _id: { $in: memberships.map((m) => m.groupId) },
    linkedRole: { $exists: true, $nin: [null, "", "admin"] },
  }).fetchAsync();
  for (const group of groups) {
    await Roles.createRoleAsync(group.linkedRole, { unlessExists: true });
    await Roles.addUsersToRolesAsync(user._id, group.linkedRole);
  }
};
