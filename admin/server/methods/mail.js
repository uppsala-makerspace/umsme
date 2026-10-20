import { Email } from "meteor/email";
import { Members } from "/imports/common/collections/members.js";
import { MessageTemplates } from "/imports/common/collections/templates";
import { messageData } from "/imports/common/lib/message";
import { isEmailAllowed } from "/imports/common/server/emailGuard";
import { sendMail } from "../mail/send";

Meteor.methods({
  async mail(to, subject, text, from, html) {
    if (!Meteor.userId() || !await Roles.userIsInRoleAsync(Meteor.userId(), 'admin')) {
      throw new Meteor.Error('Not authorized');
    }
    return sendMail({ to, subject, text, from, html });
  },
  async mailAboutMemberShip(email) {
    const mb = await Members.findOneAsync({ email: email });
    const template = await MessageTemplates.findOneAsync({
      type: "status",
      deprecated: false,
    });

    if (mb && template) {
      if (!isEmailAllowed(email)) {
        console.log(`Email to ${email} blocked by whitelist`);
        return;
      }
      const data = await messageData(mb._id, template._id);
      console.log(data.messagetext);
      const from = Meteor.settings.noreply || "no-reply@uppsalamakerspace.se";
      return Email.sendAsync({
        to: email,
        from,
        subject: data.subject,
        text: data.messagetext,
      });
    }
    if (mb) {
      console.log("Missing status template");
    } else {
      console.log(`No member discovered for email ${email}`);
    }
  },
  fromOptions() {
    const f = Meteor.settings.from;
    return (Array.isArray(f) ? f : [f]).map((email) => ({
      label: email,
      value: email,
    }));
  },

  async sendVerificationEmail() {
    if (!Meteor.userId() || !await Roles.userIsInRoleAsync(Meteor.userId(), 'admin')) {
      throw new Meteor.Error('Not authorized');
    }
    return Accounts.sendVerificationEmail(this.userId);
  },
});

//ta gärna bort metoden med min mejl som var här om ni inte gjort det, mvh
