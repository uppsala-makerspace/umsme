import { Meteor } from "meteor/meteor";
import { Members } from "/imports/common/collections/members";
import Invites from "/imports/common/collections/Invites";
import {findForUser} from "/server/methods/utils";

Meteor.methods({
  async createOrUpdateProfile({name, mobile, birthyear}) {
    const { user, email, member, invite } = findForUser();
    if (!user) throw new Meteor.Error(
      "no-user",
      "No user signed in"
    );
    if (!verified)
      throw new Meteor.Error("not-verified", "E-post är inte verifierad");

    if (member) {
      member.name = name;
      member.mobile = mobile;
      member.birthyear = birthyear;
      await Members.updateAsync(member);
    } else {
      let mid;
      let foundUniqeId = false;
      do {
        mid = "" + Math.floor(Math.random()*100000);
        const conflictingMember = await Members.findOneAsync({mid});
        foundUniqeId = conflictingMember === undefined;
      } while (!foundUniqeId);
      const newMember = {
        name,
        email,
        mobile,
        mid
      };
      if (invite) {
        newMember.infamily = invite.infamily;
      }
      await Members.insertAsync(newMember);
      if (invite) {
        await Invites.removeAsync({_id: invite._id});
      }
    }
  },
});
