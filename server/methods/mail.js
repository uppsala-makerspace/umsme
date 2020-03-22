import { Email } from 'meteor/email'

Meteor.methods({
  'mail': (to, subject, text, from) => {
    if (Meteor.userId() && Meteor.settings.deliverMails) {
      const f = Meteor.settings.from;
      Email.send({ to, from: from ? from :  (Array.isArray(f) ? f[0] : f), subject, text });
    }
  },
  'fromOptions': () => {
    const f = Meteor.settings.from;
    return (Array.isArray(f) ? f : [f]).map((email) => ({ label: email, value: email }));
  }
});
