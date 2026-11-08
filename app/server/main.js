import { Meteor } from "meteor/meteor";
import "/imports/common/server/familyCascade";
import "/imports/common/server/storage/membershipSync";
import "./methods";
import "./accounts";
import "./tests/init";
import "./api/expenseReceipt";
import "./api/workshopImage";
import { ensureStorageIndexes } from "/imports/common/server/storageIndexes";
import { ensureDoorUnlockIndexes } from "/imports/common/server/doors/doorUnlocks";
import { applyMailUrlFromSettings } from "/imports/common/server/mailUrl";
import { runSeedFromEnv } from "/imports/common/server/seed/runFromEnv";
import { enforceReadOnlyWhileImpersonating } from "./impersonation/readOnly";

applyMailUrlFromSettings();

Meteor.startup(async () => {
  // First, and after every module above has registered its methods: a method
  // registered later would escape the read-only rule for switched users.
  enforceReadOnlyWhileImpersonating();
  const seedSummary = await runSeedFromEnv();
  await ensureStorageIndexes();
  await ensureDoorUnlockIndexes();
  if (seedSummary) console.log(seedSummary().map((line) => `[seed] ${line}`).join("\n"));
});
