import { Meteor } from "meteor/meteor";
import Invites from "/imports/common/collections/Invites";
import { Members } from "/imports/common/collections/members";
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

    // Check that family members + invites doesn't exceed 4
    const familyMembersCount = await Members.find({infamily: member._id}).countAsync();
    const invitesCount = await Invites.find({infamily: member._id}).countAsync();
    if (familyMembersCount + invitesCount >= 4) {
      throw new Meteor.Error(
        "family-full",
        "Maximum 4 family members and invites allowed"
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
      await Members.updateAsync(member._id, {$set: {infamily: invite.infamily}});
      await Invites.removeAsync(invite);
    }
  },

  async removeFamilyMember({email}) {
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

    const familyMember = await Members.findOneAsync({email, infamily: member._id});
    if (!familyMember) {
      throw new Meteor.Error(
        "not-in-family",
        "No family member with this email in your family"
      );
    }

    await Members.updateAsync(familyMember._id, {$unset: {infamily: ""}, $set: {family: false}});
    return true;
  },
});
