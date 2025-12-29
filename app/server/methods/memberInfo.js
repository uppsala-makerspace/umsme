import { Meteor } from "meteor/meteor";
import { Members } from "/imports/common/collections/members";
import { Memberships } from "/imports/common/collections/memberships";
import { memberStatus } from '/imports/common/lib/utils';
import {findMemberForUser} from "/server/methods/utils";

Meteor.methods({
  findMemberForUser: findMemberForUser,

  findMembershipsForUser: async () => {
    const member = await findMemberForUser();
    return Memberships.find({ mid: member._id }).fetchAsync();
  },

  /**
   * Method to get a hold of the current member, it's memberships, current status, familyMembers (if you are part of a family) and the paying family member.
   *
   * @return {Promise<{
   *     member,
   *     memberships,
   *     status: ({memberEnd, memberStart, labEnd, labStart, family: boolean}|{}),
   *     familyMembers,
   *     paying
   *   }>}
   */
  findInfoForUser: async () => {
    const member = await findMemberForUser();

    if (!member) {
      throw new Meteor.Error(
        "not-found",
        "No member object can be found for the current user"
      );
    }
    let paying;
    let memberships;
    if (member.infamily) {
      // If you are in a family, find the paying member
      paying = await Members.findOneAsync({ mid: member.infamily });
    } else {
      // If you are not in a family or you are in a family and are the paying member
      paying = member;
      memberships = await Memberships.find({
        mid: member._id,
      }).fetchAsync();
      memberships.sort((m1, m2) => (m1.memberend > m2.memberend ? -1 : 1));
    }

    const status = await memberStatus(paying);

    let familyMembers;
    if (member.family) {
      familyMembers = await Members.find({
        infamily: paying._id, // non-paying members of the family
      }).fetchAsync();
    }
    return { member, memberships, status, familyMembers, paying };
  },
});
