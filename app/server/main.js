//import "./cronjob/notifyExpiring";
//import "./api/pushMethods.js";
//import "./api";
import "./methods";
import "./api/test";
import "./accounts";

// E2E test data seeding - only load in test mode
if (process.env.SEED_TEST_DATA === 'true') {
  import("./seedTestData");
}
