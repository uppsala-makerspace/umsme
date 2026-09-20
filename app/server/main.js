import { Meteor } from "meteor/meteor";
import "/imports/common/server/familyCascade";
import "/imports/common/server/storage/membershipSync";
import "/imports/common/collections/storeItemsDeny";
import "./methods";
import "./accounts";
import "./tests/init";
import "./api/expenseReceipt";
import "./api/workshopImage";
import { ensureStorageIndexes } from "/imports/common/server/storageIndexes";
import { applyMailUrlFromSettings } from "/imports/common/server/mailUrl";

applyMailUrlFromSettings();

// E2E test data seeding - only load in test mode
if (process.env.SEED_TEST_DATA === 'true') {
  import("./seedTestData");
}

Meteor.startup(async () => {
  await ensureStorageIndexes();
});
