import { Meteor } from "meteor/meteor";
import { Accounts } from "meteor/accounts-base";
import { Email } from "meteor/email";
import Invites from "/imports/common/collections/Invites";
import { Members } from "/imports/common/collections/members";
import { Messages } from "/imports/common/collections/messages";
import { findBestTemplate, messageData } from "/imports/common/lib/message";
import { isEmailAllowed } from "/imports/common/server/emailGuard";
import {findMemberForUser} from "/server/methods/utils";
import { normalizeEmail } from "/imports/common/lib/memberMatch";

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

    // Invites are stored lowercased like member emails, so the invited person
    // is found by their member email regardless of how the address was typed.
    email = normalizeEmail(email);

    // Inviting yourself would make you a member of your own family: accepting
    // sets infamily to your own _id, which hides your memberships everywhere
    // and stops the family cascade from reaching your dependents.
    if (email === member.email) {
      throw new Meteor.Error(
        "self-invite",
        "You cannot invite yourself to your own family"
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

    const tpl = await findBestTemplate({ type: 'invite' });
    if (!tpl) {
      console.warn(`inviteFamilyMember: no 'invite' template configured — invite saved but no email sent to ${email}.`);
      return true;
    }
    if (!isEmailAllowed(email)) {
      console.log(`inviteFamilyMember: email to ${email} blocked by whitelist; invite saved.`);
      return true;
    }

    const data = await messageData(member._id, tpl._id);
    const from = Accounts.emailTemplates.from || "no-reply@uppsalamakerspace.se";

    await Email.sendAsync({ to: email, from, subject: data.subject, text: data.messagetext });

    await Messages.insertAsync({
      template: tpl._id,
      member: member._id,
      type: 'invite',
      to: email,
      subject: data.subject,
      senddate: new Date(),
      messagetext: data.messagetext,
    });

    console.log(`inviteFamilyMember: ${member.name} <${member.email}> sent invite to ${email}.`);

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
    email = normalizeEmail(email);
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
    } else if (invite.infamily === member._id) {
      // A self-invite from before inviteFamilyMember refused them. Left in
      // place so the member can clear it with Decline, which removes it.
      throw new Meteor.Error(
        "self-invite",
        "You cannot join your own family"
      );
    } else {
      await Members.updateAsync(member._id, {$set: {infamily: invite.infamily}});
      await Invites.removeAsync(invite);
    }
  },

  async leaveFamilyMembership() {
    const member = await findMemberForUser();
    if (!member) {
      throw new Meteor.Error(
        "no-user",
        "No user or the user is not fully registered"
      );
    }

    if (!member.infamily) {
      throw new Meteor.Error(
        "not-in-family",
        "The user is not part of a family"
      );
    }

    await Members.updateAsync(member._id, {$unset: {infamily: ""}, $set: {family: false}});
    return true;
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

    email = normalizeEmail(email);
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
