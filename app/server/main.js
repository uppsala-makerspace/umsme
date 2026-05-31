import { Meteor } from "meteor/meteor";
import "/imports/common/server/familyCascade";
import "./methods";
import "./accounts";
import "./tests/init";

// Set MAIL_URL from settings if configured
if (Meteor.settings.private?.mailUrl) {
  process.env.MAIL_URL = Meteor.settings.private.mailUrl;
}

// E2E test data seeding - only load in test mode
if (process.env.SEED_TEST_DATA === 'true') {
  import("./seedTestData");
}
