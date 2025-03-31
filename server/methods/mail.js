import { Email } from 'meteor/email'
import { Members } from '/collections/members.js';
import { MessageTemplates } from '/collections/templates';
import { messageData } from "/lib/message";

Meteor.methods({
  mail(to, subject, text, from) {
    if (!Meteor.userId()) {
      const mesg = `No user logged in, cannot send mail to ${to}`;
      console.log(mesg);
      throw new Meteor.Error(mesg);
    }
    if (!Meteor.settings.deliverMails) {
      const mesg = `Flag deliverMail in settings not set, cannot send mail to ${to}`;
//      console.log(mesg);
      throw new Meteor.Error(mesg);
    }
    let f = Meteor.settings.from;
    return Email.sendAsync({ to, from: from ? from :  (Array.isArray(f) ? f[0] : f), subject, text })
      .then(() => {
        console.log(`Sent mail to ${to}`);
      })
      .catch(err => {
        const mesg = 'Failed sending mail: ' + err;
        console.log(mesg);
        throw new Meteor.Error(mesg);
      });
  },
  async mailAboutMemberShip(email) {
    const mb = await Members.findOneAsync({email: email});
    const template = await MessageTemplates.findOneAsync({ type: 'status', deprecated: false });

    if (mb && template) {
      const data = messageData(mb._id, template._id);
      console.log(data.messagetext);
      const from = Meteor.settings.noreply || "no-reply@uppsalamakerspace.se";
      return Email.sendAsync({ to: email, from, subject: data.subject, text: data.messagetext});
    }
    if (mb) {
      console.log("Missing status template");
    } else {
      console.log(`No member discovered for email ${email}`);
    }
  },
  fromOptions() {
    const f = Meteor.settings.from;
    return (Array.isArray(f) ? f : [f]).map((email) => ({ label: email, value: email }));
  }
});
