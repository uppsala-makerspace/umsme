import { Meteor } from "meteor/meteor";
import { Roles } from "meteor/roles";
import { Groups } from "/imports/common/collections/groups";
import { GroupMemberships } from "/imports/common/collections/groupMemberships";
import { Workshops } from "/imports/common/collections/workshops";
import { Members } from "/imports/common/collections/members";
import { syncLinkedRole } from "/imports/common/server/linkedRoleSync";
import { groupImageUrlFor } from "/imports/common/server/workshopImage";
import { publishManagerEvent, ManagerEventType } from "/imports/common/server/managerEvents";
import { findMemberForUser, isActiveMember, spacesMapView } from "./utils";

const requireMember = async () => {
  const member = await findMemberForUser();
  if (!member) {
    throw new Meteor.Error("not-found", "Member not found");
  }
  return member;
};

const getGroup = async (groupId) => {
  const group = await Groups.findOneAsync(groupId);
  if (!group) {
    throw new Meteor.Error("not-found", "Group not found");
  }
  return group;
};

const isAdminish = async () =>
  Meteor.userId() && (await Roles.userIsInRoleAsync(Meteor.userId(), ["admin", "board"]));

/**
 * Whether a member may approve/reject join requests for a group, per its join
 * policy: request-any → any active group member; request-responsible → only
 * the group responsible. Admin/board may always. Since approving means seeing
 * other members' names, it additionally requires an active makerspace
 * membership (registered + paid, not expired).
 */
const canApprove = async (group, member) => {
  if (await isAdminish()) return true;
  if (!(await isActiveMember(member))) return false;
  if (group.joinPolicy === "request-responsible") {
    return group.responsibleMemberId === member._id;
  }
  const membership = await GroupMemberships.findOneAsync({
    groupId: group._id,
    memberId: member._id,
    state: "active",
  });
  return !!membership;
};

const groupSummary = async (group, memberId) => {
  const memberCount = await GroupMemberships.find({
    groupId: group._id,
    state: "active",
  }).countAsync();
  const myMembership = await GroupMemberships.findOneAsync({
    groupId: group._id,
    memberId,
  });
  return {
    _id: group._id,
    name: group.name,
    description: group.description,
    type: group.type,
    slackChannel: group.slackChannel,
    joinPolicy: group.joinPolicy,
    parentGroupId: group.parentGroupId,
    imageUrl: groupImageUrlFor(group),
    memberCount,
    myState: myMembership?.state || null,
    myIsResponsible: group.responsibleMemberId === memberId,
  };
};

const joinEventBody = (member, group, action) =>
  `*${member.name}* ${action} *${group.name?.sv || group._id}*.`;

Meteor.methods({
  /**
   * All groups with member counts and the caller's own membership state.
   */
  "groups.list": async () => {
    const member = await requireMember();
    const groups = await Groups.find({}, { sort: { "name.sv": 1 } }).fetchAsync();
    const result = [];
    for (const group of groups) {
      result.push(await groupSummary(group, member._id));
    }
    return result;
  },

  /**
   * The caller's own memberships (active and pending) with group summaries.
   */
  "groups.myGroups": async () => {
    const member = await requireMember();
    const memberships = await GroupMemberships.find({ memberId: member._id }).fetchAsync();
    const result = [];
    for (const membership of memberships) {
      const group = await Groups.findOneAsync(membership.groupId);
      if (group) result.push(await groupSummary(group, member._id));
    }
    return result;
  },

  /**
   * One group with its members, responsible, relations, and — when the caller
   * may approve — the pending join requests.
   */
  "groups.getDetails": async (groupId) => {
    const member = await requireMember();
    const group = await getGroup(groupId);

    const summary = await groupSummary(group, member._id);

    const activeCaller = await isActiveMember(member);

    // Member names are only for active makerspace members (registered + paid,
    // not expired) that have joined this group, or admin/board. The group
    // responsible's NAME is public; everyone always gets the member count.
    const canSeeMembers =
      (await isAdminish()) || (summary.myState === "active" && activeCaller);

    const members = [];
    if (canSeeMembers) {
      const activeMemberships = await GroupMemberships.find(
        { groupId, state: "active" },
        { sort: { requestedAt: 1 } }
      ).fetchAsync();
      for (const membership of activeMemberships) {
        const m = await Members.findOneAsync(membership.memberId);
        members.push({
          memberId: membership.memberId,
          name: m?.name || "Unknown",
          isResponsible: group.responsibleMemberId === membership.memberId,
        });
      }
    }

    const responsible = group.responsibleMemberId
      ? await Members.findOneAsync(group.responsibleMemberId)
      : null;

    const parentGroup = group.parentGroupId
      ? await Groups.findOneAsync(group.parentGroupId)
      : null;
    const childGroups = await Groups.find(
      { parentGroupId: groupId },
      { sort: { "name.sv": 1 } }
    ).fetchAsync();

    // The group's workshop: directly for workshop groups, via the parent
    // workshop group for responsibility subgroups (e.g. Ugnsgruppen shows
    // Keramikverkstaden).
    let workshop = await Workshops.findOneAsync({ groupId });
    if (!workshop && group.parentGroupId) {
      workshop = await Workshops.findOneAsync({ groupId: group.parentGroupId });
    }

    const userCanApprove = await canApprove(group, member);
    let pendingRequests = [];
    if (userCanApprove) {
      const pending = await GroupMemberships.find(
        { groupId, state: "pending" },
        { sort: { requestedAt: 1 } }
      ).fetchAsync();
      for (const membership of pending) {
        const m = await Members.findOneAsync(membership.memberId);
        pendingRequests.push({
          memberId: membership.memberId,
          name: m?.name || "Unknown",
          requestedAt: membership.requestedAt,
        });
      }
    }

    return {
      group: summary,
      members,
      responsibleName: responsible?.name || null,
      parentGroup: parentGroup
        ? { _id: parentGroup._id, name: parentGroup.name }
        : null,
      childGroups: childGroups.map((g) => ({ _id: g._id, name: g.name })),
      workshop: workshop ? { _id: workshop._id, name: workshop.name } : null,
      canSeeMembers,
      canJoin: activeCaller,
      canApprove: userCanApprove,
      pendingRequests,
      mapView: await spacesMapView(group),
    };
  },

  /**
   * Join a group, per its join policy: open groups grant membership at once,
   * request-* groups create a pending request.
   */
  "groups.join": async (groupId) => {
    const member = await requireMember();
    // Joining (open or by request) requires an active makerspace membership:
    // registered + paid, not expired. Leaving is always allowed.
    if (!(await isActiveMember(member))) {
      throw new Meteor.Error(
        "not-active-member",
        "An active membership is required to join groups"
      );
    }
    const group = await getGroup(groupId);

    const existing = await GroupMemberships.findOneAsync({ groupId, memberId: member._id });
    if (existing) {
      throw new Meteor.Error(
        existing.state === "active" ? "already-member" : "already-pending",
        "You are already a member or have a pending request"
      );
    }

    const open = group.joinPolicy === "open";
    const doc = {
      groupId,
      memberId: member._id,
      state: open ? "active" : "pending",
      requestedAt: new Date(),
    };
    if (open) {
      doc.approvedAt = new Date();
      doc.approvedBy = "__system__";
    }
    try {
      await GroupMemberships.insertAsync(doc);
    } catch (err) {
      // The unique {groupId, memberId} index closes the check-then-insert race.
      throw new Meteor.Error("already-pending", "You are already a member or have a pending request");
    }

    if (open) {
      await syncLinkedRole(group);
      await publishManagerEvent(ManagerEventType.GROUP_JOIN_APPROVED, {
        subject: "New group member",
        body: joinEventBody(member, group, "joined the open group"),
      });
    } else {
      await publishManagerEvent(ManagerEventType.GROUP_JOIN_REQUESTED, {
        subject: "Group join request",
        body: joinEventBody(member, group, "asked to join"),
      });
    }
    return open ? "active" : "pending";
  },

  /**
   * Leave a group (or withdraw a pending request). The group responsible must
   * be replaced before they can leave.
   */
  "groups.leave": async (groupId) => {
    const member = await requireMember();
    const group = await getGroup(groupId);
    if (group.responsibleMemberId === member._id) {
      throw new Meteor.Error(
        "is-responsible",
        "The group responsible must be reassigned before leaving"
      );
    }
    const removed = await GroupMemberships.removeAsync({ groupId, memberId: member._id });
    if (removed === 0) {
      throw new Meteor.Error("not-member", "You are not a member of this group");
    }
    await syncLinkedRole(group);
    return true;
  },

  /**
   * Approve a pending join request (authorization per the group's join policy).
   */
  "groups.approve": async (groupId, memberId) => {
    const member = await requireMember();
    const group = await getGroup(groupId);
    if (!(await canApprove(group, member))) {
      throw new Meteor.Error("not-authorized", "You may not approve requests for this group");
    }
    const membership = await GroupMemberships.findOneAsync({ groupId, memberId, state: "pending" });
    if (!membership) {
      throw new Meteor.Error("not-found", "No pending request for that member");
    }
    await GroupMemberships.updateAsync(membership._id, {
      $set: { state: "active", approvedAt: new Date(), approvedBy: member._id },
    });
    await syncLinkedRole(group);

    const joiner = await Members.findOneAsync(memberId);
    await publishManagerEvent(ManagerEventType.GROUP_JOIN_APPROVED, {
      subject: "Group join approved",
      body: `*${joiner?.name || memberId}* was approved into *${group.name?.sv || groupId}* by ${member.name}.`,
    });
    return true;
  },

  /**
   * Reject (remove) a pending join request (same authorization as approve).
   */
  "groups.reject": async (groupId, memberId) => {
    const member = await requireMember();
    const group = await getGroup(groupId);
    if (!(await canApprove(group, member))) {
      throw new Meteor.Error("not-authorized", "You may not reject requests for this group");
    }
    const removed = await GroupMemberships.removeAsync({ groupId, memberId, state: "pending" });
    if (removed === 0) {
      throw new Meteor.Error("not-found", "No pending request for that member");
    }
    return true;
  },
});
