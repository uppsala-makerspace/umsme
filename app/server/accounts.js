import { Meteor } from "meteor/meteor";
import { Accounts } from "meteor/accounts-base";
import { syncLinkedRolesForUser } from "/imports/common/server/linkedRoleSync";

/**
 * If a user has already been created, and used their Google email, this will
 * allow them to sign in with the Meteor.loginWithGoogle method later, without
 * creating a new user.
 */
Accounts.setAdditionalFindUserOnExternalLogin(
  ({ serviceName, serviceData }) => {
    if (serviceName === "google") {
      return Accounts.findUserByEmail(serviceData.email);
    }
  }
);

/**
 * If user is signing in with oauth, make sure the email is set on the emails list as well as username.
 * This is neccessary for two reasons:
 * 1. The services section is not available on the client, this fix avoids the redirect to wait for email verification
 * 2. This prevents the user from creating another user (regular email based) that duplicates the oauth user.
 */
Accounts.onLogin(async function (loginInfo) {
  if (!loginInfo.user.emails && loginInfo.user.services) {
    const email = loginInfo.user.services?.google.email || loginInfo.user.services?.facebook.email;
    await Meteor.users.updateAsync(loginInfo.user._id, {
      $set: {
        emails: [{ address: email, verified: true }],
        username: email
      },
    });
  }

  // Grant roles linked to the member's groups (linkedRole). Catches members
  // who were approved into a role-linked group before their account existed
  // or their email was verified. Never blocks the login.
  try {
    const user = await Meteor.users.findOneAsync(loginInfo.user._id);
    await syncLinkedRolesForUser(user);
  } catch (err) {
    console.error("[linkedRoleSync] onLogin sync failed:", err);
  }
});

Meteor.startup(async () => {
  Accounts.config({
    sendVerificationEmail: true,
  });

  Accounts.emailTemplates.siteName = 'Uppsala MakerSpace';
  // Neccessary to allow gmail to send along the emails
  Accounts.emailTemplates.from = 'Uppsala MakerSpace <no-reply@uppsalamakerspace.se>';
  // Path to reset password page
  Accounts.urls.resetPassword = (token) => {
    return Meteor.absoluteUrl(`resetPassword/${token}`);
  };

  await ServiceConfiguration.configurations.upsertAsync(
    { service: "google" },
    {
      $set: {
        ...Meteor.settings.serviceConfigurations.google,
      },
    }
  );
/*
    await ServiceConfiguration.configurations.upsertAsync(
      { service: "facebook" },
      {
        $set: {
          ...Meteor.settings.serviceConfigurations.facebook,
        },
      }
    );*/
});
