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
import {
  register, withdraw, takeSeat, markAttended, closeAttendance,
} from '/imports/common/server/activities/registrations';
import { EventRegistrations } from '/imports/common/collections/eventRegistrations';
import { createActivityFromEvent, matchingEvents, linkEvents } from '/imports/common/server/activities/linking';
import { calendarConfigured, calendarPreview, importCalendarEvents } from '/imports/common/server/activities/calendarImport';
import { ActivityInterests } from '/imports/common/collections/activityInterests';
import { Members } from '/imports/common/collections/members';
import { GroupMemberships } from '/imports/common/collections/groupMemberships';

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
  hostsPublished: Flag,
  registration: Text,
  minSeats: Num,
  maxSeats: Num,
  queueAllowed: Flag,
  infoRequired: Flag,
  infoPlaceholder: Text,
  requiredCertificateId: Text,
  targetCertificateId: Text,
  checkIn: Text,
  checkInOpensDaysBefore: Num,
  checkInOpensAt: Text,
  checkInClosesDaysBefore: Num,
  checkInClosesAt: Text,
};
const ActivityFields = { ...SharedFields, groupId: Text, eventBookers: Text, startsAt: Text, endsAt: Text };
const EventFields = {
  ...SharedFields,
  activityId: Text,
  groupId: Text,
  start: Date,
  end: Match.Optional(Match.Maybe(Date)),
  hostMemberIds: Match.Optional([String]),
  status: Text,
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

  /** An event's registrations, with the members' names, oldest first. */
  async 'eventRegistrations.list'(eventId) {
    check(eventId, String);
    await requireRole(this.userId, roles);
    const registrations = await EventRegistrations.find({ eventId }, { sort: { registeredAt: 1 } }).fetchAsync();
    const members = await Members.find({ _id: { $in: registrations.map((r) => r.memberId) } }, { fields: { name: 1, mid: 1 } }).fetchAsync();
    const byId = new Map(members.map((m) => [m._id, m]));
    return registrations.map((r) => ({ ...r, memberName: byId.get(r.memberId)?.name || r.memberId, mid: byId.get(r.memberId)?.mid }));
  },

  /** Board or admin adds a member: neither the certificate nor the information is asked for. */
  async 'eventRegistrations.add'(eventId, memberId) {
    check(eventId, String);
    check(memberId, String);
    await requireRole(this.userId, roles);
    return register(eventId, memberId, { userId: this.userId, override: true });
  },

  async 'eventRegistrations.withdraw'(eventId, memberId) {
    check(eventId, String);
    check(memberId, String);
    await requireRole(this.userId, roles);
    await withdraw(eventId, memberId, { userId: this.userId, override: true });
  },

  /** Give a queued member a free seat. */
  async 'eventRegistrations.takeSeat'(eventId, memberId) {
    check(eventId, String);
    check(memberId, String);
    await requireRole(this.userId, roles);
    return takeSeat(eventId, memberId, { userId: this.userId });
  },

  async 'eventRegistrations.markAttended'(eventId, memberId, attended) {
    check(eventId, String);
    check(memberId, String);
    check(attended, Boolean);
    await requireRole(this.userId, roles);
    await markAttended(eventId, memberId, attended, { userId: this.userId });
  },

  async 'eventRegistrations.closeAttendance'(eventId) {
    check(eventId, String);
    await requireRole(this.userId, roles);
    return closeAttendance(eventId, { userId: this.userId });
  },

  /** How many have shown interest in an activity. */
  async 'activities.interestCount'(activityId) {
    check(activityId, String);
    await requireRole(this.userId, roles);
    return ActivityInterests.find({ activityId }).countAsync();
  },

  /** Make an activity of a free-standing event, which becomes its first. */
  async 'activities.createFromEvent'(eventId) {
    check(eventId, String);
    await requireRole(this.userId, roles);
    return createActivityFromEvent(eventId, { userId: this.userId });
  },

  /** The free-standing events with an activity's name. */
  async 'activities.matchingEvents'(activityId) {
    check(activityId, String);
    await requireRole(this.userId, roles);
    return (await matchingEvents(activityId)).map((e) => ({ _id: e._id, name: e.name, start: e.start, end: e.end, status: e.status }));
  },

  async 'activities.linkEvents'(activityId, eventIds) {
    check(activityId, String);
    check(eventIds, [String]);
    await requireRole(this.userId, roles);
    return linkEvents(activityId, eventIds, { userId: this.userId });
  },

  /** Whether a calendar is configured to import from. */
  async 'calendar.configured'() {
    await requireRole(this.userId, roles);
    return calendarConfigured();
  },

  /** The calendar's events between two days, and what each would become. */
  async 'calendar.preview'(from, to) {
    check(from, Date);
    check(to, Date);
    await requireRole(this.userId, roles);
    return calendarPreview({ from, to });
  },

  async 'calendar.import'(from, to, googleEventIds) {
    check(from, Date);
    check(to, Date);
    check(googleEventIds, [String]);
    await requireRole(this.userId, roles);
    return importCalendarEvents({ from, to, googleEventIds }, { userId: this.userId });
  },

  /** A group's active members, by name: those who may host its events, as the app offers them. */
  async 'activities.groupMembers'(groupId) {
    check(groupId, String);
    await requireRole(this.userId, roles);
    const memberIds = (await GroupMemberships.find({ groupId, state: 'active' }, { fields: { memberId: 1 } }).fetchAsync()).map((m) => m.memberId);
    return Members.find({ _id: { $in: memberIds } }, { fields: { name: 1, mid: 1 }, sort: { name: 1 } }).fetchAsync();
  },
});

