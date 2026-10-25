import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { requireRole, DOMAIN_ROLES } from '/imports/common/server/authz';
import {
  createActivity, updateActivity, removeActivity, setActivityImage, removeActivityImage,
} from '/imports/common/server/activities/activities';
import {
  createEvent, updateEvent, removeEvent, setEventImage, removeEventImage,
} from '/imports/common/server/activities/events';
import { createCategory, updateCategory, removeCategory } from '/imports/common/server/activities/categories';

// Board and admin: activities, events and categories alike. They may choose
// anyone as a host, so every call here is `isAdminish`.
const roles = DOMAIN_ROLES.activities;
const Bilingual = Match.Maybe({ sv: Match.Maybe(String), en: Match.Maybe(String) });
const Text = Match.Optional(Match.Maybe(String));
const Num = Match.Optional(Match.Maybe(Number));
const Flag = Match.Optional(Match.Maybe(Boolean));
const SharedFields = {
  name: Match.Optional(Bilingual),
  description: Match.Optional(Bilingual),
  categoryId: Text,
  workshopId: Text,
  spaceId: Text,
  slackChannel: Text,
  contactEmail: Text,
  durationMinutes: Num,
  cost: Num,
  membersOnly: Flag,
  published: Flag,
  registration: Text,
  minSeats: Num,
  maxSeats: Num,
  queueAllowed: Flag,
  infoRequired: Flag,
  infoPlaceholder: Text,
  requiredCertificateId: Text,
  checkInEnabled: Flag,
  checkInOpensHoursBefore: Num,
};
const ActivityFields = { ...SharedFields, groupId: Text, eventBookers: Text };
const EventFields = {
  ...SharedFields,
  activityId: Text,
  groupId: Text,
  start: Date,
  end: Match.Optional(Match.Maybe(Date)),
  hostMemberIds: Match.Optional([String]),
  status: Text,
  checkInDeadline: Match.Optional(Match.Maybe(Date)),
  googleEventId: Text,
};
const CategoryFields = { name: Bilingual, sortOrder: Num };

const image = (setImage, removeImage) => ({
  async upload(docId, imageBase64, mimeType) {
    check(docId, String);
    check(imageBase64, String);
    check(mimeType, String);
    await requireRole(this.userId, roles);
    return setImage(docId, { imageBase64, mimeType }, { userId: this.userId });
  },
  async remove(docId) {
    check(docId, String);
    await requireRole(this.userId, roles);
    await removeImage(docId, { userId: this.userId });
  },
});
const activityImage = image(setActivityImage, removeActivityImage);
const eventImage = image(setEventImage, removeEventImage);

Meteor.methods({
  async 'activities.create'(fields) {
    check(fields, ActivityFields);
    await requireRole(this.userId, roles);
    return createActivity(fields, { userId: this.userId });
  },

  async 'activities.update'(docId, fields, expectedUpdatedAt) {
    check(docId, String);
    check(fields, ActivityFields);
    check(expectedUpdatedAt, Match.Maybe(Date));
    await requireRole(this.userId, roles);
    await updateActivity(docId, fields, { userId: this.userId, expectedUpdatedAt: expectedUpdatedAt ?? null });
  },

  async 'activities.remove'(docId) {
    check(docId, String);
    await requireRole(this.userId, roles);
    await removeActivity(docId, { userId: this.userId });
  },

  'activities.uploadImage': activityImage.upload,
  'activities.removeImage': activityImage.remove,

  async 'events.create'(fields) {
    check(fields, EventFields);
    await requireRole(this.userId, roles);
    return createEvent(fields, { userId: this.userId, isAdminish: true });
  },

  async 'events.update'(docId, fields, expectedUpdatedAt) {
    check(docId, String);
    check(fields, EventFields);
    check(expectedUpdatedAt, Match.Maybe(Date));
    await requireRole(this.userId, roles);
    await updateEvent(docId, fields, { userId: this.userId, isAdminish: true, expectedUpdatedAt: expectedUpdatedAt ?? null });
  },

  async 'events.remove'(docId) {
    check(docId, String);
    await requireRole(this.userId, roles);
    await removeEvent(docId, { userId: this.userId });
  },

  'events.uploadImage': eventImage.upload,
  'events.removeImage': eventImage.remove,

  async 'activityCategories.create'(fields) {
    check(fields, CategoryFields);
    await requireRole(this.userId, roles);
    return createCategory(fields, { userId: this.userId });
  },

  async 'activityCategories.update'(docId, fields, expectedUpdatedAt) {
    check(docId, String);
    check(fields, CategoryFields);
    check(expectedUpdatedAt, Match.Maybe(Date));
    await requireRole(this.userId, roles);
    await updateCategory(docId, fields, { userId: this.userId, expectedUpdatedAt: expectedUpdatedAt ?? null });
  },

  async 'activityCategories.remove'(docId) {
    check(docId, String);
    await requireRole(this.userId, roles);
    await removeCategory(docId, { userId: this.userId });
  },
});
