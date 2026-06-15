import { Meteor } from "meteor/meteor";
import { Members } from "/imports/common/collections/members";
import { findForUser } from "/server/methods/utils";

Meteor.methods({
  async createOrUpdateProfile({name, mobile, birthyear, gender, rfid, bankName, bankClearing, bankAccountNumber, bankAccountHolder}) {
    const { user, email, member, verified } = await findForUser();
    if (!user) throw new Meteor.Error(
      "no-user",
      "No user signed in"
    );
    if (!verified)
      throw new Meteor.Error("not-verified", "E-post är inte verifierad");
    if (!name || !name.trim())
      throw new Meteor.Error("name-required", "Name is required");

    // Bank fields are only present when the profile showed the bank section
    // (expense-allowed members). Only persist keys that were provided, so a
    // regular profile save never clobbers existing bank details.
    const bankFields = {};
    if (bankName !== undefined) bankFields.bankName = bankName;
    if (bankClearing !== undefined) bankFields.bankClearing = bankClearing;
    if (bankAccountNumber !== undefined) bankFields.bankAccountNumber = bankAccountNumber;
    if (bankAccountHolder !== undefined) bankFields.bankAccountHolder = bankAccountHolder;

    if (member) {
      await Members.updateAsync(member._id, {$set: {name, mobile, birthyear, gender, rfid, ...bankFields}});
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
        mid,
        birthyear,
        gender,
        rfid,
        ...bankFields
      };
      await Members.insertAsync(newMember);
    }
  },
});
