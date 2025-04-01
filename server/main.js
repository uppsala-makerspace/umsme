import { Meteor } from 'meteor/meteor';
import { Accounts } from "meteor/accounts-base";
import { Members } from '/collections/members';
import { Memberships } from '/collections/memberships';
import { MessageTemplates } from '/collections/templates';
import { Messages } from '/collections/messages';
import { Payments } from '/collections/payments';
import { Mails } from '/collections/mails';
import { Comments} from "/collections/comments";
import { Unlocks } from '/collections/unlocks';

import './methods/mail';
import './methods/lock';
import './methods/bank';

import '../lib/tabular/index';

Meteor.startup(() => {
  // code to run on server at startup

    if (Meteor.isServer) {
      try {
        console.log("Admin1");
        if(!Accounts.findUserByUsername('admin')) {
        Accounts.createUser({username: 'admin', password: Meteor.settings?.adminpassword || 'adminadmin'});
        console.log("Admin2");
        }
      } catch (e) {
        console.log("Admin3");
        Accounts.setPassword('admin', Meteor.settings?.adminpassword || 'adminadmin');
      }


        // This code only runs on the server
      Meteor.publish('members', function () {
        if (this.userId) {
          return Members.find();
        }
      });

      Meteor.publish('memberships', function () {
        if (this.userId) {
          return Memberships.find();
        }
      });
      Meteor.publish('templates', function () {
        if (this.userId) {
          return MessageTemplates.find();
        }
      });
      Meteor.publish('messages', function () {
        if (this.userId) {
          return Messages.find();
        }
        });
      Meteor.publish('mails', function () {
        if (this.userId) {
          return Mails.find();
        }
      });
      Meteor.publish('payments', function () {
        if (this.userId) {
          return Payments.find();
        }
      });
      Meteor.publish('comments', function () {
        if (this.userId) {
          return Comments.find();
        }
      });
      Meteor.publish('unlocks', function () {
        if (this.userId) {
          return Unlocks.find();
        }
        });
    }
});