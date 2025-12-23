import { Meteor } from "meteor/meteor";
import { Accounts } from "meteor/accounts-base";

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

const checkForDuplicateUser = async (user) => {
  const email = user.emails?.[0]?.address;
  if (email) {
    const existingUser = await Meteor.users.findOneAsync({
      "emails.address": email,
    });

    if (existingUser) {
      throw new Meteor.Error(
        "account-merge",
        "Det finns redan ett konto med den här e-postadressen. Logga in istället."
      );
    }
  }

  return user;
};

Accounts.urls.resetPassword = (token) => {
  return Meteor.absoluteUrl(`reset-password/${token}`);
};

Accounts.onCreateUser(async (options, user) => {
  await checkForDuplicateFacebookUser(user);
  await checkForDuplicateGoogleUser(user);
  await checkForDuplicateUser(user);
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
  console.log("ROOT_URL is:", process.env.ROOT_URL);
  Accounts.config({
    sendVerificationEmail: true,
  });

  /*  await ServiceConfiguration.configurations.upsertAsync(
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
    );*/
});
