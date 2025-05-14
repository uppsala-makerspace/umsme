import { SyncedCron } from "meteor/chatra:synced-cron";

SyncedCron.add({
  name: "Skicka push till utgående medlemskap",
  schedule(parser) {
    return parser.text("at 09:00 am"); // This is UTC, Swedish time is UTC+1 or UTC+2 depending on summer time
  },
  job() {
    console.log("🕒 Cron-jobb körs");
    Meteor.call("notifyExpiringMemberships");
  },
});

SyncedCron.start();
