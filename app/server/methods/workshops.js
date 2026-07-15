import { Meteor } from "meteor/meteor";
import { Workshops } from "/imports/common/collections/workshops";
import { Groups } from "/imports/common/collections/groups";
import { GroupMemberships } from "/imports/common/collections/groupMemberships";
import { Certificates } from "/imports/common/collections/certificates";
import { workshopImageUrlFor } from "/imports/common/server/workshopImage";
import { findMemberForUser } from "./utils";

const requireMember = async () => {
  const member = await findMemberForUser();
  if (!member) {
    throw new Meteor.Error("not-found", "Member not found");
  }
  return member;
};

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

    let group = null;
    if (workshop.groupId) {
      const groupDoc = await Groups.findOneAsync(workshop.groupId);
      if (groupDoc) {
        const memberCount = await GroupMemberships.find({
          groupId: groupDoc._id,
          state: "active",
        }).countAsync();
        const myMembership = await GroupMemberships.findOneAsync({
          groupId: groupDoc._id,
          memberId: member._id,
        });
        group = {
          _id: groupDoc._id,
          name: groupDoc.name,
          memberCount,
          myState: myMembership?.state || null,
        };
      }
    }

    const certificates = (
      await Certificates.find({ workshopId }, { sort: { "name.sv": 1 } }).fetchAsync()
    ).map((c) => ({ _id: c._id, name: c.name, mandatory: c.mandatory }));

    return {
      workshop: publicWorkshopFields(workshop),
      group,
      certificates,
    };
  },
});
