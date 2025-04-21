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
    memberships.sort((m1, m2) => m1.memberend > m2.memberend ? -1 : 1);
    let familyHead;
    if (member.infamily) {
      familyHead = await Memberships.findOneAsync({mid: member.infamily});
    }
    const familyId = member.infamily || member._id;
    const familyMembers = await Members.find({
      $or: [
        { infamily: familyId }, // barn i familjen
        { _id: familyId }, // familjehuvude<<<<<t
      ],
    }).fetchAsync();

    return { member, memberships, familyHead, familyMembers };
  },
});
