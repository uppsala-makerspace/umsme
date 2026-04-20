import { Meteor } from "meteor/meteor";
import { Roles } from "meteor/roles";
import { Members } from "/imports/common/collections/members";
import { PushSubs } from "/imports/common/collections/pushSubs";
import { Announcements } from "/imports/common/collections/announcements";
import { initPush, sendPushToSubscriptions } from "/imports/common/server/push";

Meteor.startup(() => {
  initPush();
});

/**
 * Build a bilingual push payload for an announcement.
 */
const announcementPayload = (announcement) => ({
  title: {
    sv: announcement.subjectSv,
    en: announcement.subjectEn || announcement.subjectSv,
  },
  body: {
    sv: announcement.subjectSv,
    en: announcement.subjectEn || announcement.subjectSv,
  },
  category: "announcements",
  timestamp: Date.now(),
});

Meteor.methods({
  async "announcements.sendPush"(announcementId) {
    if (!Meteor.userId() || !await Roles.userIsInRoleAsync(Meteor.userId(), ['admin', 'board'])) {
      throw new Meteor.Error('Not authorized');
    }

    const announcement = await Announcements.findOneAsync(announcementId);
    if (!announcement) {
      throw new Meteor.Error('not-found', 'Announcement not found');
    }

    // Find all members who have announcements notifications enabled (default true)
    const members = await Members.find({
      'notificationPrefs.announcements': { $ne: false },
      email: { $exists: true },
    }).fetchAsync();

    const payload = announcementPayload(announcement);
    let count = 0;

    for (const member of members) {
      const user = await Meteor.users.findOneAsync({ 'emails.address': member.email });
      if (!user) continue;

      const subs = await PushSubs.find({ userId: user._id }).fetchAsync();
      if (subs.length === 0) continue;

      await sendPushToSubscriptions(subs, payload);
      count++;
    }

    console.log(`[Push] Sent announcement push to ${count} members`);
    return { count };
  },
});
