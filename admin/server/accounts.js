import { Meteor } from "meteor/meteor";
import { Accounts } from "meteor/accounts-base";
import { Roles } from "meteor/roles";
import { ServiceConfiguration } from "meteor/service-configuration";

/**
 * The roles that see anything in the admin UI (AppBody.html shows a "no
 * access" page to everyone else).
 */
export const ADMIN_ACCESS_ROLES = ["admin", "board", "treasurer", "storage"];

/**
 * Refuse logins from accounts with none of those roles. The users collection
 * is shared with the member app, so every member's account could otherwise
 * log in here, and with it reach the DDP methods this server exposes.
 * Applies to resume logins too, so a member's app token is refused as well.
 */
export const checkAdminLoginAttempt = async (attempt) => {
  if (!attempt.allowed || !attempt.user) return attempt.allowed;
  if (await Roles.userIsInRoleAsync(attempt.user._id, ADMIN_ACCESS_ROLES)) return true;
  throw new Meteor.Error(403, "This account has no access to the administration system");
};

Accounts.validateLoginAttempt(checkAdminLoginAttempt);

/**
 * If a user has already been created with a matching email, allow them to
 * sign in via Google without creating a duplicate account.
 */
Accounts.setAdditionalFindUserOnExternalLogin(
  ({ serviceName, serviceData }) => {
    if (serviceName === "google") {
      return Accounts.findUserByEmail(serviceData.email);
    }
  }
);

/**
 * When signing in with OAuth, ensure the email is set on the emails array
 * and username, since the services subdocument is not published to the client.
 */
Accounts.onLogin(async function (loginInfo) {
  if (!loginInfo.user.emails && loginInfo.user.services) {
    const email = loginInfo.user.services?.google?.email;
    if (email) {
      await Meteor.users.updateAsync(loginInfo.user._id, {
        $set: {
          emails: [{ address: email, verified: true }],
          username: email,
        },
      });
    }
  }
});

export default async () => {
  if (Meteor.settings.serviceConfigurations?.google) {
    await ServiceConfiguration.configurations.upsertAsync(
      { service: "google" },
      { $set: { ...Meteor.settings.serviceConfigurations.google } }
    );
  }
};
