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
import './cronjob/syncAndMailUnlocks';

import './methods/mail';
import './methods/lock';
import './methods/bank';
import './methods/check';
import './methods/update';
import '../lib/tabular/index';

process.env.MAIL_URL = "smtp://makupp30%40gmail.com:qlrlilvzxpnfjtut@smtp.gmail.com:587/";

Meteor.startup(async () => {
  Accounts.config({
    sendVerificationEmail: true
  });
  
  const adminUser = await Accounts.findUserByUsername('admin');
  if (adminUser) {
    await Accounts.setPasswordAsync(adminUser._id, Meteor.settings?.adminpassword || 'adminadmin');
  } else {
    await Accounts.createUserAsync({username: 'admin', password: Meteor.settings?.adminpassword || 'adminadmin'});
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

   await ServiceConfiguration.configurations.upsertAsync(
    {service: 'google'},
    {
      $set: {
        ...Meteor.settings.serviceConfigurations.google,
      },
    },
  );

  await ServiceConfiguration.configurations.upsertAsync(
    {service: 'facebook'},
    {
      $set: {
        ...Meteor.settings.serviceConfigurations.facebook,
      },
    },
  );
});