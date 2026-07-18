import { Meteor } from "meteor/meteor";
import { Workshops } from "/imports/common/collections/workshops";
import { Groups } from "/imports/common/collections/groups";
import { GroupMemberships } from "/imports/common/collections/groupMemberships";
import { Certificates } from "/imports/common/collections/certificates";
import { Spaces } from "/imports/common/collections/spaces";
import { workshopImageUrlFor } from "/imports/common/server/workshopImage";
import { findMemberForUser } from "./utils";

const requireMember = async () => {
  const member = await findMemberForUser();
  if (!member) {
    throw new Meteor.Error("not-found", "Member not found");
  }
  return member;
};

// Group summary for the workshop page's group lists: active member count and
// the caller's own membership state, like groups.list provides.
const groupSummary = async (groupDoc, memberId) => ({
  _id: groupDoc._id,
  name: groupDoc.name,
  type: groupDoc.type,
  memberCount: await GroupMemberships.find({
    groupId: groupDoc._id,
    state: "active",
  }).countAsync(),
  myState:
    (await GroupMemberships.findOneAsync({ groupId: groupDoc._id, memberId }))
      ?.state || null,
});

const publicWorkshopFields = (workshop) => ({
  _id: workshop._id,
  name: workshop.name,
  description: workshop.description,
  status: workshop.status,
  slackChannel: workshop.slackChannel,
  guidesUrl: workshop.guidesUrl,
  groupId: workshop.groupId,
  imageUrl: workshopImageUrlFor(workshop),
});

Meteor.methods({
  /**
   * All workshops for the member-facing workshop view (every status — the UI
   * badges trial/forming/decommissioned).
   */
  "workshops.list": async () => {
    await requireMember();
    const workshops = await Workshops.find({}, { sort: { "name.sv": 1 } }).fetchAsync();
    return workshops.map(publicWorkshopFields);
  },

  /**
   * One workshop plus its responsible group and linked certificates.
   */
  "workshops.getDetails": async (workshopId) => {
    const member = await requireMember();
    const workshop = await Workshops.findOneAsync(workshopId);
    if (!workshop) {
      throw new Meteor.Error("not-found", "Workshop not found");
    }

    // The responsible workshop group and its responsibility subgroups, for
    // the "get involved" list.
    let group = null;
    const responsibilityGroups = [];
    if (workshop.groupId) {
      const groupDoc = await Groups.findOneAsync(workshop.groupId);
      if (groupDoc) {
        group = await groupSummary(groupDoc, member._id);
        const children = await Groups.find(
          { parentGroupId: groupDoc._id },
          { sort: { "name.sv": 1 } }
        ).fetchAsync();
        for (const child of children) {
          responsibilityGroups.push(await groupSummary(child, member._id));
        }
      }
    }

    // Groups that declared this workshop as related (e.g. an interest group
    // that partly operates here).
    const relatedGroups = [];
    const related = await Groups.find(
      { relatedWorkshopIds: workshopId },
      { sort: { "name.sv": 1 } }
    ).fetchAsync();
    for (const relatedGroup of related) {
      relatedGroups.push(await groupSummary(relatedGroup, member._id));
    }

    const certificates = (
      await Certificates.find({ workshopId }, { sort: { "name.sv": 1 } }).fetchAsync()
    ).map((c) => ({ _id: c._id, name: c.name, mandatory: c.mandatory }));

    // The primary map space, for the map card's deep link.
    const spaceDoc = workshop.primarySpaceId
      ? await Spaces.findOneAsync(workshop.primarySpaceId)
      : null;
    const primarySpace = spaceDoc
      ? { spaceId: spaceDoc.spaceId, name: spaceDoc.name }
      : null;

    return {
      workshop: publicWorkshopFields(workshop),
      group,
      responsibilityGroups,
      relatedGroups,
      certificates,
      primarySpace,
    };
  },
});
