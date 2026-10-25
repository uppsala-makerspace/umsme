import { Meteor } from "meteor/meteor";
import "/imports/common/server/familyCascade";
import "/imports/common/server/storage/membershipSync";
import "./methods";
import "./accounts";
import "./tests/init";
import "./api/expenseReceipt";
import "./api/workshopImage";
import { ensureStorageIndexes } from "/imports/common/server/storageIndexes";
import { applyMailUrlFromSettings } from "/imports/common/server/mailUrl";
import { runSeedFromEnv } from "/imports/common/server/seed/runFromEnv";
import { ensureActivityMessageTemplates } from "/imports/common/server/activities/defaultTemplates";

applyMailUrlFromSettings();

Meteor.startup(async () => {
  const seedSummary = await runSeedFromEnv();
  await ensureStorageIndexes();
  await ensureActivityMessageTemplates();
  if (seedSummary) console.log(seedSummary().map((line) => `[seed] ${line}`).join("\n"));
});
