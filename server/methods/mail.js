import { Email } from 'meteor/email'
import { Members } from '/collections/members.js';
import { MessageTemplates } from '/collections/templates';
import { messageData } from "/lib/message";


Meteor.methods({
  'mail': (to, subject, text, from) => {
    if (Meteor.userId() && Meteor.settings.deliverMails) {
      const f = Meteor.settings.from;
      Email.send({ to, from: from ? from :  (Array.isArray(f) ? f[0] : f), subject, text });
    }
  },
  'mailAboutMemberShip': (email) => {
    const mb = Members.findOne({email: email});
    const template = MessageTemplates.findOne({ type: 'status', deprecated: false });

    if (mb && template) {
      const data = messageData(mb._id, template._id);
      console.log(data.messagetext);
      const from = Meteor.settings.noreply || "no-reply@uppsalamakerspace.se";
      Email.send({ to: email, from, subject: data.subject, text: data.messagetext});
      return true;
    }
    if (mb) {
      console.log("Missing status template");
    } else {
      console.log(`No member discovered for email ${email}`);
    }
  },
  'fromOptions': () => {
    const f = Meteor.settings.from;
    return (Array.isArray(f) ? f : [f]).map((email) => ({ label: email, value: email }));
  }
});
