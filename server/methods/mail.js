import { Email } from 'meteor/email'

Meteor.methods({
  'mail': (to, subject, text) => {
    if (Meteor.userId() && Meteor.settings.deliverMails) {
      Email.send({ to, from: Meteor.settings.from, subject, text });
    }
  },
});
