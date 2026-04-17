import { Meteor } from "meteor/meteor";
import { Accounts } from "meteor/accounts-base";
import { Email } from "meteor/email";
import { check } from "meteor/check";
import { Members } from "/imports/common/collections/members";

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
  },

  checkMemberEmail: async (email) => {
    check(email, String);

    const member = await Members.findOneAsync({ email });
    if (member) {
      const appUrl = Meteor.absoluteUrl();
      await Email.sendAsync({
        to: email,
        from: Accounts.emailTemplates.from || "no-reply@uppsalamakerspace.se",
        subject: "Din e-post hos Uppsala MakerSpace / Your email at Uppsala MakerSpace",
        text: [
          `Hej!`,
          ``,
          `Någon har kontrollerat om e-postadressen ${email} är kopplad till ett medlemskap hos Uppsala MakerSpace, och det stämmer!`,
          ``,
          `Om du vill skapa ett konto, använd denna e-postadress när du registrerar dig på ${appUrl} eller logga in med Google.`,
          ``,
          `Om du inte har begärt denna kontroll kan du lugnt ignorera detta meddelande.`,
          ``,
          `---`,
          ``,
          `Hi!`,
          ``,
          `Someone checked whether the email address ${email} is linked to a membership at Uppsala MakerSpace, and it is!`,
          ``,
          `If you'd like to create an account, use this email address when signing up at ${appUrl} or sign in with Google.`,
          ``,
          `If you did not request this check, you can safely ignore this message.`,
        ].join("\n"),
      });
    }
  },
});