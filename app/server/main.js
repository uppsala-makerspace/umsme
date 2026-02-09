import "./cronjob/notifyExpiring";
import { Meteor } from "meteor/meteor";
import "./methods";
import "./accounts";

// Set MAIL_URL from settings if configured
if (Meteor.settings.private?.mailUrl) {
  process.env.MAIL_URL = Meteor.settings.private.mailUrl;
}

// E2E test data seeding - only load in test mode
if (process.env.SEED_TEST_DATA === 'true') {
  import("./seedTestData");
}
