import { Meteor } from "meteor/meteor";
import { Members } from "/imports/common/collections/members";
import { Memberships } from "/imports/common/collections/memberships";
import { memberStatus } from '/imports/common/lib/utils';
import { findMemberForUser, findForUser } from "/server/methods/utils";
import Invites from "/imports/common/collections/Invites";

Meteor.methods({
  findMemberForUser: findMemberForUser,

  findMembershipsForUser: async () => {
    const member = await findMemberForUser();
    return Memberships.find({ mid: member._id }).fetchAsync();
  },

  /**
   * Method to get a hold of the current member, it's memberships, current status, familyMembers (if you are part of a family) and the paying family member.
   * For a member that payed for a family membership there are familyMembers (those that accepted) and familyInvites
   * (those that have been invited but have not yet created an account and accepted).
   * There may also be an invite to a family before he/she has accepted.
   *
   * @return {Promise<{
   *     member,
   *     memberships,
   *     status: ({memberEnd, memberStart, labEnd, labStart, family: boolean}|{}),
   *     familyMembers,
   *     familyInvites,
   *     invite,
   *     paying,
   *     liabilityDate
   *   }>}
   */
  findInfoForUser: async () => {
    const info = await findForUser();

    if (!info.member) {
      return info;
    }

    const member = info.member;
    let paying;
    let memberships;
    if (member.infamily) {
      // If you are in a family, find the paying member
      paying = await Members.findOneAsync(member.infamily);
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
    let familyInvites;
    if (member.family) {
      familyMembers = await Members.find({
        infamily: paying._id, // non-paying members of the family
      }).fetchAsync();
      familyInvites = await Invites.find({
        infamily: paying._id, // non-paying members of the family
      }).fetchAsync();
    }
    let invite;
    if (!member.infamily) {
      invite = await Invites.findOneAsync({email: member.email});
    }
    const liabilityDate = member.liabilityDate ?? null;
    return Object.assign(info, {memberships, status, familyMembers, familyInvites, invite, paying, liabilityDate});
  },
});
