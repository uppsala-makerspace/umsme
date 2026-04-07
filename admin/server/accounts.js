import { Accounts } from "meteor/accounts-base";
import { ServiceConfiguration } from "meteor/service-configuration";

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
