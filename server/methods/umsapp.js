import { Meteor } from "meteor/meteor";
import { Members } from "/collections/members";
import { Memberships } from "/collections/memberships";

const findMemberForUser = async () => {
  if (Meteor.userId()) {
    const user = await Meteor.userAsync();
    const email = user?.emails?.[0]?.address;
    if (user?.emails?.[0]?.verified) {
      return Members.findOneAsync({ email });
    }
  }
};

Meteor.methods({
  findMemberForUser: findMemberForUser,
  findMembershipsForUser: async () => {
    const member = await findMemberForUser();
    return Memberships.find({ mid: member._id }).fetchAsync();
  },
  findInfoForUser: async () => {
    const member = await findMemberForUser();
    const memberships = await Memberships.find({
      mid: member._id,
    }).fetchAsync();
    const familyHeadMs = await Memberships.find({
      mid: member.infamily,
    }).fetchAsync();
    const familyId = member.infamily || member._id;
    const familyMembers = await Members.find({
      $or: [
        { infamily: familyId }, // barn i familjen
        { _id: familyId }, // familjehuvudet
      ],
    }).fetchAsync();

    console.log("family:", familyHeadMs);
    console.log("member:", member);
    return { member, memberships, familyHeadMs, familyMembers };
  },
});
