import { Meteor } from "meteor/meteor";
import { Accounts } from "meteor/accounts-base";
import { Roles } from "meteor/roles";
import { Members } from "/collections/members";
import { Memberships } from "/collections/memberships";
import { MessageTemplates } from "/collections/templates";
import { Messages } from "/collections/messages";
import { Payments } from "/collections/payments";
import { Mails } from "/collections/mails";
import { Comments } from "/collections/comments";
import { Unlocks } from "/collections/unlocks";
import { initiatedPayments } from "/collections/initiatedPayments";
import "/collections/users";
import "./cronjob/syncAndMailUnlocks";

import "./api";
import "./methods/mail";
import "./methods/lock";
import "./methods/bank";
import "./methods/check";
import "./methods/update";
import "./methods/admin";
import "./methods/umsapp";
import "/lib/tabular/index";

process.env.MAIL_URL =
  "smtp://makupp30%40gmail.com:qlrlilvzxpnfjtut@smtp.gmail.com:587/";

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

Accounts.urls.resetPassword = (token) => {
  return Meteor.absoluteUrl(`reset-password/${token}`);
};

Accounts.onCreateUser(async (options, user) => {
  await checkForDuplicateFacebookUser(user);
  await checkForDuplicateGoogleUser(user);
  return user;
});

Accounts.onLogin(async function (loginInfo) {
  const userId = loginInfo.user._id;
  const googleEmail = loginInfo.user.services.google?.email;
  const facebookEmail = loginInfo.user.services.facebook?.email;
  const email = loginInfo.user.emails?.[0]?.address;

  if (email && loginInfo.user.emails[0].verified) {
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
  } catch (error) {
    console.error("Error updating user:", error);
  }
});

Meteor.startup(async () => {
  Accounts.config({
    sendVerificationEmail: true,
  });

  let adminUser = await Accounts.findUserByUsername("admin");
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
    adminUser = await Accounts.findUserByUsername("admin");
  }
  await Roles.createRoleAsync("admin", { unlessExists: true });
  await Roles.addUsersToRolesAsync(adminUser._id, "admin", null);

  const createAuthFuncFor = (col) =>
    async function () {
      if (
        this.userId &&
        (await Roles.userIsInRoleAsync(this.userId, "admin"))
      ) {
        return col.find();
      }
    };
  Meteor.publish("members", createAuthFuncFor(Members));
  Meteor.publish("memberships", createAuthFuncFor(Memberships));
  Meteor.publish("templates", createAuthFuncFor(MessageTemplates));
  Meteor.publish("messages", createAuthFuncFor(Messages));
  Meteor.publish("mails", createAuthFuncFor(Mails));
  Meteor.publish("payments", createAuthFuncFor(Payments));
  Meteor.publish("comments", createAuthFuncFor(Comments));
  Meteor.publish("unlocks", createAuthFuncFor(Unlocks));
  Meteor.publish("users", createAuthFuncFor(Meteor.users));
  Meteor.publish(null, createAuthFuncFor(Meteor.roleAssignment));
  Meteor.publish(null, createAuthFuncFor(Meteor.roles));
  Meteor.publish("initiatedPayments", createAuthFuncFor(initiatedPayments))

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
