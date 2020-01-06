import { Email } from 'meteor/email'

Meteor.methods({
  'mail': (to, subject, text) => {
    Email.send({ to, from: "kansliet@uppsalamakerspace.se", subject, text });
  },
});
