import { Meteor } from "meteor/meteor";
import { check, Match } from "meteor/check";
import { Messages } from "/imports/common/collections/messages";
import { Announcements } from "/imports/common/collections/announcements";
import { findMemberForUser } from "/server/methods/utils";

Meteor.methods({
  async getMessagesAndAnnouncements() {
    const member = await findMemberForUser();
    if (!member) {
      return { messages: [], announcements: [] };
    }

    const messages = await Messages.find(
      { member: member._id },
      { fields: { _id: 1, subject: 1, senddate: 1, type: 1 } }
    ).fetchAsync();

    const announcements = await Announcements.find(
      { status: "sent" },
      { fields: { _id: 1, subjectSv: 1, subjectEn: 1, sentAt: 1, type: 1 } }
    ).fetchAsync();

    return { messages, announcements };
  },

  async getMessageDetail(id, kind) {
    check(id, String);
    check(kind, Match.OneOf("message", "announcement"));

    const member = await findMemberForUser();
    if (!member) {
      throw new Meteor.Error("no-member", "No member record found");
    }

    if (kind === "message") {
      const message = await Messages.findOneAsync(id);
      if (!message || message.member !== member._id) {
        throw new Meteor.Error("not-found", "Message not found");
      }
      return message;
    }

    const announcement = await Announcements.findOneAsync(id);
    if (!announcement || announcement.status !== "sent") {
      throw new Meteor.Error("not-found", "Announcement not found");
    }
    return announcement;
  },
});
