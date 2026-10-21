import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { requireRole, DOMAIN_ROLES } from '/imports/common/server/authz';
import { createAnnouncement, updateAnnouncement, removeAnnouncement } from '/imports/common/server/announcements/announcements';

const roles = DOMAIN_ROLES.announcements;
const AnnouncementFields = {
  type: String,
  subjectSv: String,
  subjectEn: Match.Optional(Match.OneOf(null, String)),
  bodySv: String,
  bodyEn: Match.Optional(Match.OneOf(null, String)),
};

Meteor.methods({
  async 'announcements.create'(fields) {
    check(fields, AnnouncementFields);
    await requireRole(this.userId, roles);
    return createAnnouncement(fields, { userId: this.userId });
  },

  async 'announcements.update'(docId, fields, expectedUpdatedAt) {
    check(docId, String);
    check(fields, AnnouncementFields);
    check(expectedUpdatedAt, Match.OneOf(null, Date));
    await requireRole(this.userId, roles);
    await updateAnnouncement(docId, fields, { userId: this.userId, expectedUpdatedAt });
  },

  async 'announcements.remove'(docId) {
    check(docId, String);
    await requireRole(this.userId, roles);
    await removeAnnouncement(docId, { userId: this.userId });
  },
});
