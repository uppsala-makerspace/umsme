import { Meteor } from 'meteor/meteor';
import { Members } from '/collections/members';
import { Memberships } from '/collections/memberships';
import { MessageTemplates } from '/collections/templates';
import { Messages } from '/collections/messages';
import { Payments } from '/collections/payments';
import './methods/import';
import './methods/update';
import './methods/mail';
import './methods/bank';

Meteor.startup(() => {
  // code to run on server at startup
});

if (Meteor.isServer) {
  // This code only runs on the server
  Meteor.publish('members', function() {
    if (this.userId) {
      return Members.find();
    }
  });
  Meteor.publish('memberships', function() {
    if (this.userId) {
      return Memberships.find();
    }
  });
  Meteor.publish('templates', function() {
    if (this.userId) {
      return MessageTemplates.find();
    }
  });
  Meteor.publish('messages', function() {
    if (this.userId) {
      return Messages.find();
    }
  });
  Meteor.publish('payments', function() {
    if (this.userId) {
      return Payments.find();
    }
  });
}