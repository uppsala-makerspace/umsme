import { Meteor } from "meteor/meteor";
import { Members } from "/imports/common/collections/members";
import Invites from "/imports/common/collections/Invites";

export const findForUser = async () => {
  let user;
  let email;
  let verified;
  let member;
  let invite;
  if (Meteor.userId()) {
    user = await Meteor.userAsync();
    const firstEmail = user?.emails?.[0];
    if (firstEmail) {
      email = firstEmail?.address;
      verified = firstEmail.verified;
      if (verified) {
        member = await Members.findOneAsync({email});
        if (!member) {
          invite = await Invites.findOneAsync({email});
        }
      }
    }
  }
  return {user, email, verified, member, invite};
};

export const findMemberForUser = async () => {
  const { member } = await findForUser();
  return member;
};
