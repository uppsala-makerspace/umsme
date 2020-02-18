import { Email } from 'meteor/email'

Meteor.methods({
  'mail': (to, subject, text) => {
    if (Meteor.userId()) {
      Email.send({ to, from: Meteor.settings.from, subject, text });
    }
  },
});
