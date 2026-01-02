import { Meteor } from "meteor/meteor";
import { Accounts } from "meteor/accounts-base";

Meteor.methods({
  sendVerificationEmail: async () => {
    const user = await Meteor.userAsync();
    if (!user) {
      throw new Meteor.Error(
        "no-user",
        "No user signed in to send verification email for"
      );
    }
    await Accounts.sendVerificationEmail(user._id);
  }
});