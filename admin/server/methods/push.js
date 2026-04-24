import { Meteor } from "meteor/meteor";
import { Roles } from "meteor/roles";
import { Members } from "/imports/common/collections/members";
import { Announcements } from "/imports/common/collections/announcements";
import { initPush, pushMessage, pushAnnouncement } from "/imports/common/server/push";
import { check } from "meteor/check";

Meteor.startup(() => {
  initPush();
});

Meteor.methods({
  async "announcements.sendPush"(announcementId) {
    check(announcementId, String);
    if (!Meteor.userId() || !await Roles.userIsInRoleAsync(Meteor.userId(), ['admin', 'board'])) {
      throw new Meteor.Error('Not authorized');
    }

    const announcement = await Announcements.findOneAsync(announcementId);
    if (!announcement) {
      throw new Meteor.Error('not-found', 'Announcement not found');
    }

    // All members — pushAnnouncement handles opt-out and missing data
    const members = await Members.find({ email: { $exists: true } }).fetchAsync();

    for (const member of members) {
      await pushAnnouncement(member, announcementId);
    }

    console.log(`[Push] Sent announcement push for ${announcementId}`);
  },

  async "messages.sendPush"(messageId) {
    check(messageId, String);
    if (!Meteor.userId() || !await Roles.userIsInRoleAsync(Meteor.userId(), ['admin', 'board'])) {
      throw new Meteor.Error('Not authorized');
    }
    await pushMessage(messageId);
  },
});
