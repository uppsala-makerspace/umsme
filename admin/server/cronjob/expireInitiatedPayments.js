/**
 * Background job to expire stale initiated payments.
 * Configurable via Meteor.settings.expireInitiatedPayments array.
 *
 * Each entry in the array should have:
 * - paymentType: The type of payment to expire (e.g. "swish")
 * - expiry: Time in seconds after which to expire (e.g. 360 for 6 minutes)
 * - recurrence: How often to run the job in seconds (e.g. 60 for every minute)
 */

import { Meteor } from "meteor/meteor";
import { SyncedCron } from "meteor/chatra:synced-cron";
import { expireStaleInitiatedPayments } from "/imports/common/server/expireInitiatedPayments";

const jobConfigs = Meteor.settings?.expireInitiatedPayments || [];

if (Meteor.isServer) {
  jobConfigs.forEach((config) => {
    const { paymentType, expiry, recurrence } = config;

    if (!paymentType || !expiry || !recurrence) {
      console.warn("[Cron] Invalid expireInitiatedPayments config, skipping:", config);
      return;
    }

    SyncedCron.add({
      name: `Expire stale ${paymentType} initiated payments`,
      schedule(parser) {
        return parser.recur().every(recurrence).second();
      },
      async job() {
        const result = await expireStaleInitiatedPayments({
          paymentType,
          expirySeconds: expiry,
        });
        if (result > 0) {
          console.log(`[Cron] Expired ${result} stale ${paymentType} initiated payments`);
        }
        return `Expired ${result} stale ${paymentType} initiated payments`;
      },
    });

    console.log(
      `[Cron] Registered expiry job for ${paymentType}: expiry=${expiry}s, recurrence=${recurrence}s`
    );
  });
}
