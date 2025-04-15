import { Meteor } from "meteor/meteor";
import { Accounts } from "meteor/accounts-base";
import { Members } from '/collections/members';
import { Memberships } from '/collections/memberships';
import { MessageTemplates } from '/collections/templates';
import { Messages } from '/collections/messages';
import { Payments } from '/collections/payments';
import { Mails } from '/collections/mails';
import { Comments} from "/collections/comments";
import { Unlocks } from '/collections/unlocks';
import '/collections/users';
import './cronjob/syncAndMailUnlocks';

import "./methods/mail";
import "./methods/lock";
import "./methods/bank";
import "./methods/check";
import "./methods/update";
import "../lib/tabular/index";

process.env.MAIL_URL =
  "smtp://makupp30%40gmail.com:qlrlilvzxpnfjtut@smtp.gmail.com:587/";

const adminEmails = [
  "ivareriks@gmail.com",
  "ivareriks+555@gmail.com",
  "ivareriks+666@gmail.com",
  "ivareriks+777@gmail.com",
  "ivareriks+888@gmail.com",
  "josefsson7.hj+04@gmail.com",
];

const updateEmails = async (userId, email) => {
  try {
    await Meteor.users.updateAsync(userId, {
      $set: {
        emails: [{ address: email, verified: true }],
      },
    });
  } catch (error) {
    console.error("Error updating user:", error);
  }
};

const updateAdminStatus = async (userId, isAdmin) => {
  try {
    await Meteor.users.updateAsync(userId, {
      $set: {
        "profile.admin": isAdmin,
      },
    });
  } catch (error) {
    console.error("Error updating user:", error);
  }
};

const checkForDuplicateGoogleUser = async (user) => {
  const googleEmail = user.services?.google?.email;
  if (!googleEmail) return;

  const existingUser = await Meteor.users.findOneAsync({
    "emails.address": googleEmail,
  });
  if (existingUser) {
    await Meteor.users.updateAsync(existingUser._id, {
      $set: {
        "services.google": user.services?.google,
      },
    });

    throw new Meteor.Error(
      "account-merge",
      "Det finns redan ett konto kopplat till den här adressen. Logga in med det kontot istället."
    );
  }
};

const checkForDuplicateFacebookUser = async (user) => {
  const facebookEmail = user.services?.facebook?.email;
  if (!facebookEmail) return;

  const existingUser = await Meteor.users.findOneAsync({
    "emails.address": facebookEmail,
  });
  if (existingUser) {
    await Meteor.users.updateAsync(existingUser._id, {
      $set: {
        "services.facebook": user.services?.facebook,
      },
    });

    throw new Meteor.Error(
      "account-merge",
      "Det finns redan ett konto kopplat till den här adressen. Logga in med det kontot istället."
    );
  }
};

Accounts.onCreateUser(async (options, user) => {
  user.profile = options.profile || {};
  const email = user.emails?.[0]?.address;
  const isAdmin = email && adminEmails.includes(email);

  await checkForDuplicateFacebookUser(user);
  await checkForDuplicateGoogleUser(user);

  updateAdminStatus(user._id, isAdmin);

  return user;
});

Accounts.onLogin(async function (loginInfo) {
  const userId = loginInfo.user._id;
  const googleEmail = loginInfo.user.services.google?.email;
  const facebookEmail = loginInfo.user.services.facebook?.email;
  const email = loginInfo.user.emails?.[0]?.address;

  if (email && loginInfo.user.emails[0].verified) {
    console.log("E-postadressen är redan verifierad.");
    return; // Avsluta callbacken
  }

  if (email) {
    // Om e-postadressen inte är verifierad, skicka ett verifieringsmejl
    if (!loginInfo.user.emails[0].verified) {
      try {
        // Skicka verifieringsmejl
        Accounts.sendVerificationEmail(userId);
        console.log("Verifieringsmejl skickat till:", email);
      } catch (err) {
        console.error("Fel vid skickande av verifieringsmejl:", err);
      }
    }
  } else {
    console.log("Användaren har ingen e-postadress.");
  }

  try {
    if (googleEmail) {
      await updateEmails(userId, googleEmail);
    }
    if (facebookEmail) {
      await updateEmails(userId, facebookEmail);
    }
    if (
      adminEmails.includes(googleEmail) ||
      adminEmails.includes(facebookEmail) ||
      adminEmails.includes(email)
    ) {
      await updateAdminStatus(userId, true);
    }
  } catch (error) {
    console.error("Error updating user:", error);
  }
});

Meteor.startup(async () => {
  Accounts.config({
    sendVerificationEmail: true,
  });

  const adminUser = await Accounts.findUserByUsername("admin");
  if (adminUser) {
    await Accounts.setPasswordAsync(
      adminUser._id,
      Meteor.settings?.adminpassword || "adminadmin"
    );
  } else {
    await Accounts.createUserAsync({
      username: "admin",
      password: Meteor.settings?.adminpassword || "adminadmin",
    });
  }

  // This code only runs on the server
  Meteor.publish("members", function () {
    if (this.userId) {
      return Members.find();
    }
  });

  Meteor.publish("memberships", function () {
    if (this.userId) {
      return Memberships.find();
    }
  });
  Meteor.publish("templates", function () {
    if (this.userId) {
      return MessageTemplates.find();
    }
  });
  Meteor.publish("messages", function () {
    if (this.userId) {
      return Messages.find();
    }
  });
  Meteor.publish("mails", function () {
    if (this.userId) {
      return Mails.find();
    }
  });
  Meteor.publish("payments", function () {
    if (this.userId) {
      return Payments.find();
    }
  });
  Meteor.publish("comments", function () {
    if (this.userId) {
      return Comments.find();
    }
  });
  Meteor.publish("unlocks", function () {
    if (this.userId) {
      return Unlocks.find();
    }
  });

  Meteor.publish('users', function () {
    if (this.userId) {
      return Meteor.users.find();
    }
  });

  await ServiceConfiguration.configurations.upsertAsync(
    { service: "google" },
    {
      $set: {
        ...Meteor.settings.serviceConfigurations.google,
      },
    }
  );

  await ServiceConfiguration.configurations.upsertAsync(
    { service: "facebook" },
    {
      $set: {
        ...Meteor.settings.serviceConfigurations.facebook,
      },
    }
  );
});
