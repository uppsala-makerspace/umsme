import { Meteor } from "meteor/meteor";
import { Members } from "/imports/common/collections/members";

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
