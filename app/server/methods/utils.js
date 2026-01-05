import { Meteor } from "meteor/meteor";
import { Members } from "/imports/common/collections/members";
import { memberStatus } from "/imports/common/lib/utils";

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
      email = firstEmail?.address;
      verified = firstEmail.verified;
      if (verified) {
        member = await Members.findOneAsync({email});
      }
    } else if (firstService) {
      email = firstService.email;
      verified = true;
    }
  }
  return {user, email, verified, member};
};

export const findMemberForUser = async () => {
  const { member } = await findForUser();
  return member;
};
