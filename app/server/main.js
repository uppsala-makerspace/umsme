import { Meteor } from "meteor/meteor";
import "/imports/common/server/familyCascade";
import "/imports/common/collections/storeItemsDeny";
import "./methods";
import "./accounts";
import "./tests/init";
import "./api/expenseReceipt";
import "./api/workshopImage";
import { ensureStorageIndexes } from "/imports/common/server/storageIndexes";

// Set MAIL_URL from settings if configured
if (Meteor.settings.private?.mailUrl) {
  process.env.MAIL_URL = Meteor.settings.private.mailUrl;
}

// E2E test data seeding - only load in test mode
if (process.env.SEED_TEST_DATA === 'true') {
  import("./seedTestData");
}

Meteor.startup(async () => {
  await ensureStorageIndexes();
});
