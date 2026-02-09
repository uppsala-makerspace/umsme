import { Meteor } from "meteor/meteor";
import { Accounts } from "meteor/accounts-base";
import { SyncedCron } from "meteor/chatra:synced-cron";
import { Members } from "/imports/common/collections/members";
import { PushSubs } from "/imports/common/collections/pushSubs";
import { memberStatus } from "/imports/common/lib/utils";
import { sendPushToSubscriptions } from "/server/methods/push";
import { loadJson } from "/server/methods/utils";
import { daysBetween } from "/imports/common/lib/dateUtils";

const notifyExpiringMemberships = async () => {
  console.log("Checking for expiring memberships");
  const today = new Date();


  const notificationTypes = loadJson("notificationsPath");

  let members = await Members.find({
    "notificationPrefs.membershipExpiry": { $ne: false },
  }).fetchAsync();
  members = members.filter(m => m.email);

  for (const member of members) {
    // Find the user linked to this member's email
    const user = await Accounts.findUserByEmail(member.email);
    if (!user) continue;

    // Get paying member for family memberships
    const paying = member.infamily
      ? await Members.findOneAsync(member.infamily)
      : member;
    if (!paying) continue;

    const status = await memberStatus(paying);
    if (!status.memberEnd) continue;

    const memberEnd = new Date(status.memberEnd);
    const labEnd = status.labEnd ? new Date(status.labEnd) : null;

    const isFamily = !!member.infamily;
    const isLab = labEnd && daysBetween(memberEnd, labEnd) !== 0;
    const endDate = isLab ? labEnd : memberEnd;

    for (const [type, config] of Object.entries(notificationTypes)) {
      if (isFamily && !config.family) continue;
      if (!isFamily && config.family) continue;
      if (isLab && !config.lab) continue;
      if (!isLab && config.lab) continue;
      if (daysBetween(today, endDate) !== config.remaining) continue;

      // Check for duplicate
      const last = member.lastExpiryNotification;
      if (last && last.type === type && daysBetween(new Date(last.date), today) === 0) {
        continue;
      }

      const subs = await PushSubs.find({ userId: user._id }).fetchAsync();
      if (subs.length === 0) continue;

      const payload = {
        title: config.title,
        body: config.body,
        category: "membershipExpiry",
        timestamp: Date.now(),
      };

      await sendPushToSubscriptions(subs, payload);

      await Members.updateAsync(member._id, {
        $set: { lastExpiryNotification: { date: today, type } },
      });

      break; // Only send one type per member per run
    }
  }
};

SyncedCron.add({
  name: "Notify expiring memberships",
  schedule(parser) {
    return parser.text("at 09:00 am");
  },
  async job() {
    console.log("Running expiring membership notification cron job");
    await notifyExpiringMemberships();
  },
});

SyncedCron.start();
