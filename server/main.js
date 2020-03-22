import { Meteor } from 'meteor/meteor';
import { Members } from '/collections/members';
import { Memberships } from '/collections/memberships';
import { MessageTemplates } from '/collections/templates';
import { Messages } from '/collections/messages';
import { Payments } from '/collections/payments';
import { Mails } from '/collections/mails';
import './methods/import';
import './methods/update';
import './methods/mail';
import './methods/bank';
import './methods/lock';

Meteor.startup(() => {
  // code to run on server at startup
  try {
    const settingstxt = Assets.getText('settings.json');
    console.log('Settings found in private/settings.json');
    try {
      Meteor.settings = JSON.parse(settingstxt);
    } catch (e) {
      console.log('private/settings.json in does not contain valid JSON');
    }
  } catch (e) {
    if (Object.keys(Meteor.settings).length === 0) {
      console.log('Settings passed on command and no settings.json in private folder.');
    } else {
      console.log('No settings passed on command and no settings.json in private folder.')
    }
    Meteor.settings = {};
  }

  try {
    const userstxt = Assets.getText('users.json');
  // if
    try {
      const users = JSON.parse(userstxt);
      // First remove users not in users.json
      console.log('Synchronizing users from private/users.json');
      const toRemove = [];
      Meteor.users.find().forEach((u) => {
        if (!users.find((usr) => usr.username === u.username)) {
          toRemove.push(u.username);
        }
      });
      toRemove.forEach((tr) => {
        Meteor.users.remove({ username: tr });
      });

      // Add users in users.json
      users.forEach(user => {
        try {
          // Try to add
          Accounts.createUser(user);
        } catch (e) {
          // User already exists, get the user and set the password according to what is specified in users.json
          const userobj = Accounts.findUserByUsername(user.username);
          Accounts.setPassword(userobj._id, user.password);
        }
      });
    } catch (e) {
      console.log('private/users.json does not contain valid JSON');
    }
  } catch(e) {
    console.log('No private/users.json, users of the system are not changed.');
    console.log('Current users in the system are:');
    console.log('---Start users-----');
    Meteor.users.find().forEach((u) => {
      console.log(u.username);
    });
    console.log('---End users-----');
  }
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
  Meteor.publish('mails', function() {
    if (this.userId) {
      return Mails.find();
    }
  });
  Meteor.publish('payments', function() {
    if (this.userId) {
      return Payments.find();
    }
  });
}