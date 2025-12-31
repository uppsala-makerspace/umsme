import { Meteor } from "meteor/meteor";
import { Members } from "/imports/common/collections/members";
import { findForUser } from "/server/methods/utils";

Meteor.methods({
  async createOrUpdateProfile({name, mobile, birthyear}) {
    const { user, email, member, verified } = await findForUser();
    if (!user) throw new Meteor.Error(
      "no-user",
      "No user signed in"
    );
    if (!verified)
      throw new Meteor.Error("not-verified", "E-post är inte verifierad");

    if (member) {
      await Members.updateAsync(member._id, {$set: {name, mobile, birthyear}});
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
      await Members.insertAsync(newMember);
    }
  },
});
