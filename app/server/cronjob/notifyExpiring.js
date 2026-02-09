import { Meteor } from "meteor/meteor";
import { Accounts } from "meteor/accounts-base";
import { SyncedCron } from "meteor/chatra:synced-cron";
import { Members } from "/imports/common/collections/members";
import { PushSubs } from "/imports/common/collections/pushSubs";
import { memberStatus } from "/imports/common/lib/utils";
import { sendPushToSubscriptions } from "/server/methods/push";

const daysBetween = (d1, d2) => {
  const ms = d2.getTime() - d1.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
};

const NOTIFICATION_TYPES = {
  "7daysBefore": {
    remaining: 7,
    title: {
      sv: "Ditt medlemskap löper ut om 7 dagar",
      en: "Your membership expires in 7 days",
    },
    body: {
      sv: "Förnya gärna för att behålla ditt medlemskap!",
      en: "Please renew to keep your membership!",
    },
  },
  dayOf: {
    remaining: 0,
    title: {
      sv: "Ditt medlemskap löper ut idag",
      en: "Your membership expires today",
    },
    body: {
      sv: "Förnya gärna för att behålla ditt medlemskap!",
      en: "Please renew to keep your membership!",
    },
  },
  "7daysAfter": {
    remaining: -7,
    title: {
      sv: "Ditt medlemskap gick ut för 7 dagar sedan",
      en: "Your membership expired 7 days ago",
    },
    body: {
      sv: "Förnya gärna för att behålla ditt medlemskap!",
      en: "Please renew to keep your membership!",
    },
  },
  lab7daysBefore: {
    remaining: 7,
    lab: true,
    title: {
      sv: "Din kvartalsvisa labbåtkomst löper ut om 7 dagar",
      en: "Your quarterly lab access expires in 7 days",
    },
    body: {
      sv: "Förnya gärna för att behålla din labbåtkomst!",
      en: "Please renew to keep your lab access!",
    },
  },
  labDayOf: {
    remaining: 0,
    lab: true,
    title: {
      sv: "Din kvartalsvisa labbåtkomst löper ut idag",
      en: "Your quarterly lab access expires today",
    },
    body: {
      sv: "Förnya gärna för att behålla din labbåtkomst!",
      en: "Please renew to keep your lab access!",
    },
  },
  lab7daysAfter: {
    remaining: -7,
    lab: true,
    title: {
      sv: "Din kvartalsvisa labbåtkomst gick ut för 7 dagar sedan",
      en: "Your quarterly lab access expired 7 days ago",
    },
    body: {
      sv: "Förnya gärna för att behålla din labbåtkomst!",
      en: "Please renew to keep your lab access!",
    },
  },
};

const notifyExpiringMemberships = async () => {
  console.log("Checking for expiring memberships");
  const today = new Date();

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
    memberEnd.setHours(0, 0, 0, 0);

    const labEnd = status.labEnd ? new Date(status.labEnd) : null;
    if (labEnd) labEnd.setHours(0, 0, 0, 0);

    const isLab = labEnd && daysBetween(memberEnd, labEnd) !== 0;
    const endDate = isLab ? labEnd : memberEnd;

    for (const [type, config] of Object.entries(NOTIFICATION_TYPES)) {
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
    return parser.text("at 11:17 pm");
  },
  async job() {
    console.log("Running expiring membership notification cron job");
    await notifyExpiringMemberships();
  },
});

SyncedCron.start();
