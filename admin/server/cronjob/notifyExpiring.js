import { Meteor } from "meteor/meteor";
import { SyncedCron } from "meteor/chatra:synced-cron";
import { Members } from "/imports/common/collections/members";
import { PushSubs } from "/imports/common/collections/pushSubs";
import { statusFromMemberships, membershipsByMember } from "/imports/common/lib/utils";
import { daysBetween } from "/imports/common/lib/dateUtils";
import { NotificationCategory } from "/imports/common/lib/notificationCategories";
import { sendPushToSubscriptions } from "/imports/common/server/push";
import { loadJson } from "/imports/common/server/configLoader";

export const notifyExpiringMemberships = async () => {
  console.log("Checking for expiring memberships");
  const today = new Date();

  const notificationTypes = await loadJson("notificationsPath", "notifications.json");

  let members = await Members.find({
    "notificationPrefs.membershipReminders": { $ne: false },
    excluded: { $ne: true },
  }).fetchAsync();
  members = members.filter((m) => m.email);

  // What the loop needs, fetched once rather than per member: the accounts
  // by email (any case, as Accounts.findUserByEmail matches), the payers of
  // family members, and every membership.
  const userByEmail = new Map();
  for (const user of await Meteor.users.find({ "emails.address": { $exists: true } }, { fields: { emails: 1 } }).fetchAsync()) {
    for (const { address } of user.emails || []) {
      if (address && !userByEmail.has(address.toLowerCase())) userByEmail.set(address.toLowerCase(), user);
    }
  }
  const payerIds = [...new Set(members.map((m) => m.infamily).filter(Boolean))];
  const payers = new Map((await Members.find({ _id: { $in: payerIds } }).fetchAsync()).map((p) => [p._id, p]));
  const memberships = await membershipsByMember();

  for (const member of members) {
    const user = userByEmail.get(member.email.toLowerCase());
    if (!user) continue;

    const paying = member.infamily ? payers.get(member.infamily) : member;
    if (!paying) continue;

    const status = statusFromMemberships(memberships[paying._id] || []);
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

      const last = member.lastExpiryNotification;
      if (last && last.type === type && daysBetween(new Date(last.date), today) === 0) {
        continue;
      }

      const subs = await PushSubs.find({ userId: user._id }).fetchAsync();
      if (subs.length === 0) continue;

      console.log(`Notifying ${member.name} about expiration, notification type:${type}`);

      const payload = {
        title: config.title,
        body: config.body,
        category: NotificationCategory.membershipReminders,
        timestamp: Date.now(),
      };

      await sendPushToSubscriptions(subs, payload);

      await Members.updateAsync(member._id, {
        $set: { lastExpiryNotification: { date: today, type } },
      });

      break;
    }
  }
};

if (Meteor.isServer) {
  SyncedCron.add({
    name: "Notify expiring memberships",
    schedule(parser) {
      const time = Meteor.settings?.private?.notifyExpiringTime || "at 09:00 am";
      return parser.text(time);
    },
    async job() {
      console.log("Running expiring membership notification cron job");
      await notifyExpiringMemberships();
    },
  });
}
