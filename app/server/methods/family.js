import { Meteor } from "meteor/meteor";
import Invites from "/imports/common/collections/Invites";
import {findMemberForUser} from "/server/methods/utils";

Meteor.methods({
  async inviteFamilyMember({email}) {
    const member = await findMemberForUser();
    if (!member) {
      throw new Meteor.Error(
        "no-user",
        "No user or the user is not fully registered"
      );
    }

    if (!member.family) {
      throw new Meteor.Error(
        "not-a-family",
        "The user does not have a family plan"
      );
    }

    const existing = await Invites.findOneAsync({ email });
    if (existing) {
      throw new Meteor.Error(
        "already-invited",
        "The email is already registrerad for an invite"
      );
    }

    await Invites.insertAsync({email, infamily: member._id});
    // TODO send email.
    return true;
  },

  async cancelFamilyMemberInvite({email}) {
    const member = await findMemberForUser();
    if (!member) {
      throw new Meteor.Error(
        "no-user",
        "No user or the user is not fully registered"
      );
    }
    const invite = await Invites.findOneAsync({email, infamily: member._id});

    if (!invite) {
      throw new Meteor.Error(
        "no-invite",
        "No invite to your family with this email"
      );
    } else {
      await Invites.removeAsync(invite);
    }
  },
  async rejectFamilyMemberInvite() {
    const member = await findMemberForUser();
    if (!member) {
      throw new Meteor.Error(
        "no-user",
        "No user or the user is not fully registered"
      );
    }
    const invite = await Invites.findOneAsync({email: member.email});

    if (!invite) {
      throw new Meteor.Error(
        "no-invite",
        "No invite exists for this member"
      );
    } else {
      await Invites.removeAsync(invite);
    }
  },
  async acceptFamilyMemberInvite() {
    const member = await findMemberForUser();
    if (!member) {
      throw new Meteor.Error(
        "no-user",
        "No user or the user is not fully registered"
      );
    }
    const invite = await Invites.findOneAsync({email: member.email});

    if (!invite) {
      throw new Meteor.Error(
        "no-invite",
        "No invite exists for this member"
      );
    } else {
      member.infamily = invite.infamily;
      await Members.updateAsync(member);
      await Invites.removeAsync(invite);
    }
  },
});
