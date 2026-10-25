import { Meteor } from "meteor/meteor";
import { check, Match } from "meteor/check";
import { Roles } from "meteor/roles";
import { Activities } from "/imports/common/collections/activities";
import { Events } from "/imports/common/collections/events";
import { ActivityCategories } from "/imports/common/collections/activityCategories";
import { Groups } from "/imports/common/collections/groups";
import { GroupMemberships } from "/imports/common/collections/groupMemberships";
import { Workshops } from "/imports/common/collections/workshops";
import { Spaces } from "/imports/common/collections/spaces";
import { Members } from "/imports/common/collections/members";
import { activityImageUrlFor, eventImageUrlFor } from "/imports/common/server/workshopImage";
import {
  resolveEvent,
  eventGroupId,
  mayEditActivity,
  mayBookEvent,
} from "/imports/common/lib/activityRules";
import { createActivity, updateActivity, removeActivity } from "/imports/common/server/activities/activities";
import { createEvent, updateEvent, removeEvent } from "/imports/common/server/activities/events";
import { findMemberForUser, isActiveMember } from "./utils";

/**
 * Activities and events for members (plan/activities.md): everyone sees them;
 * a group's steering members (or another group's responsible) create and
 * change its activities, and every active member of a group books, changes
 * and cancels its events. Board and admin may do anything. Writes go through
 * the domain functions in common/server/activities/, as admin's do.
 */

// How many events a list shows at a time.
const EVENTS_PAGE = 10;

/**
 * Activities to link to from a workshop's or a group's page, by name, each
 * with how many events are planned: to come and not cancelled.
 */
export const activityLinks = async (selector) => {
  const activities = await Activities.find(selector, { fields: { name: 1 }, sort: { "name.sv": 1 } }).fetchAsync();
  const now = new Date();
  const links = [];
  for (const activity of activities) {
    links.push({
      ...activity,
      plannedEvents: await Events.find({ activityId: activity._id, end: { $gte: now }, status: { $ne: "cancelled" } }).countAsync(),
    });
  }
  return links;
};

const requireMember = async () => {
  const member = await findMemberForUser();
  if (!member) throw new Meteor.Error("not-found", "Member not found");
  return member;
};

const isAdminish = async () =>
  !!Meteor.userId() && (await Roles.userIsInRoleAsync(Meteor.userId(), ["admin", "board"]));

const stateIn = async (groupId, memberId) =>
  (groupId ? (await GroupMemberships.findOneAsync({ groupId, memberId }))?.state : null) || null;

/**
 * What a member may do with a group's activities and events. Only an active
 * member of the association may, besides board and admin.
 */
const accessTo = async (member, groupId, { adminish, active }) => {
  if (adminish) return { edit: true, book: true };
  if (!active) return { edit: false, book: false };
  const group = groupId ? await Groups.findOneAsync(groupId) : null;
  const membershipState = await stateIn(groupId, member._id);
  const parentMembershipState = await stateIn(group?.parentGroupId, member._id);
  return {
    edit: mayEditActivity({
      isAdminish: false, group, isResponsible: group?.responsibleMemberId === member._id, membershipState, parentMembershipState,
    }),
    book: mayBookEvent({ isAdminish: false, groupId: group?._id || null, membershipState }),
  };
};

/** Who asks, once per call: the member, and whether board/admin or active. */
const caller = async () => {
  const member = await requireMember();
  const adminish = await isAdminish();
  return { member, adminish, active: adminish || (await isActiveMember(member)) };
};

/** Whether the caller may create activities owned by the group (see mayEditActivity). */
export const mayCreateActivityFor = async (groupId) => {
  const who = await caller();
  return (await accessTo(who.member, groupId, who)).edit;
};

/**
 * The groups the caller may create activities for (`edit`) or book events
 * for (`book`): every group for board and admin; for others those they are
 * an active member or the responsible of.
 */
const myGroups = async (who) => {
  if (who.adminish) {
    return (await Groups.find({}, { fields: { name: 1 }, sort: { "name.sv": 1 } }).fetchAsync())
      .map((g) => ({ _id: g._id, name: g.name, edit: true, book: true }));
  }
  if (!who.active) return [];
  const memberships = await GroupMemberships.find({ memberId: who.member._id, state: "active" }, { fields: { groupId: 1 } }).fetchAsync();
  const responsible = await Groups.find({ responsibleMemberId: who.member._id }, { fields: { _id: 1 } }).fetchAsync();
  // The activity groups under the steering groups one is in.
  const below = await Groups.find({ parentGroupId: { $in: memberships.map((m) => m.groupId) } }, { fields: { _id: 1 } }).fetchAsync();
  const ids = [...new Set([...memberships.map((m) => m.groupId), ...responsible.map((g) => g._id), ...below.map((g) => g._id)])];
  const groups = [];
  for (const group of await Groups.find({ _id: { $in: ids } }, { sort: { "name.sv": 1 } }).fetchAsync()) {
    groups.push({ _id: group._id, name: group.name, ...(await accessTo(who.member, group._id, who)) });
  }
  return groups.filter((g) => g.edit || g.book);
};

const names = async (collection, ids) => {
  const unique = [...new Set(ids.filter(Boolean))];
  const docs = unique.length ? await collection.find({ _id: { $in: unique } }, { fields: { name: 1, kind: 1 } }).fetchAsync() : [];
  return new Map(docs.map((d) => [d._id, d.name]));
};

/** Names of what activities and events refer to, looked up once for a list. */
const lookups = async (docs) => ({
  groups: await names(Groups, docs.map((d) => d.groupId)),
  categories: await names(ActivityCategories, docs.map((d) => d.categoryId)),
  workshops: await names(Workshops, docs.map((d) => d.workshopId)),
  spaces: await names(Spaces, docs.map((d) => d.spaceId)),
});

const described = (doc, lookup) => ({
  _id: doc._id,
  name: doc.name,
  description: doc.description,
  groupId: doc.groupId || null,
  groupName: lookup.groups.get(doc.groupId) || null,
  categoryName: lookup.categories.get(doc.categoryId) || null,
  workshopId: doc.workshopId || null,
  workshopName: lookup.workshops.get(doc.workshopId) || null,
  spaceName: lookup.spaces.get(doc.spaceId) || null,
  slackChannel: doc.slackChannel || null,
  contactEmail: doc.contactEmail || null,
  durationMinutes: doc.durationMinutes ?? null,
  cost: doc.cost ?? null,
  membersOnly: !!doc.membersOnly,
});

const activityView = (activity, lookup) => ({ ...described(activity, lookup), imageUrl: activityImageUrlFor(activity) });

/** An event as a member sees it: resolved against its activity. */
const eventView = (event, activity, lookup) => {
  const resolved = resolveEvent(event, activity);
  return {
    ...described(resolved, lookup),
    activityId: event.activityId || null,
    start: event.start,
    end: event.end,
    status: event.status,
    hostMemberIds: event.hostMemberIds || [],
    imageUrl: eventImageUrlFor(resolved),
  };
};

const activitiesById = async (events) => {
  const ids = [...new Set(events.map((e) => e.activityId).filter(Boolean))];
  const docs = ids.length ? await Activities.find({ _id: { $in: ids } }).fetchAsync() : [];
  return new Map(docs.map((a) => [a._id, a]));
};

/** Events as members see them, with what each refers to named. */
const eventViews = async (events) => {
  const activities = await activitiesById(events);
  const resolved = events.map((e) => resolveEvent(e, activities.get(e.activityId)));
  const lookup = await lookups(resolved);
  return events.map((e) => eventView(e, activities.get(e.activityId), lookup));
};

const getActivity = async (activityId) => {
  const activity = await Activities.findOneAsync(activityId);
  if (!activity) throw new Meteor.Error("not-found", "Activity not found");
  return activity;
};

const getEvent = async (eventId) => {
  const event = await Events.findOneAsync(eventId);
  if (!event) throw new Meteor.Error("not-found", "Event not found");
  return event;
};

const refuse = () => {
  throw new Meteor.Error("not-authorized", "You may not change this");
};

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
};
const ActivityFields = { ...SharedFields, groupId: Text };
const EventFields = {
  ...SharedFields,
  activityId: Text,
  groupId: Text,
  start: Date,
  end: Match.Optional(Match.Maybe(Date)),
  hostMemberIds: Match.Optional([String]),
  status: Text,
};

/** The group an event's fields put it in: its activity's, or its own. */
const groupOfFields = async (fields) => {
  const activity = fields.activityId ? await Activities.findOneAsync(fields.activityId) : null;
  if (fields.activityId && !activity) throw new Meteor.Error("not-found", "Activity not found");
  return eventGroupId(fields, activity);
};

Meteor.methods({
  /** The activities, and whether the caller may add an activity or an event. */
  "activities.list": async () => {
    const who = await caller();
    const groups = await myGroups(who);
    const activities = await Activities.find({}, { sort: { "name.sv": 1 } }).fetchAsync();
    const lookup = await lookups(activities);
    return {
      activities: activities.map((a) => activityView(a, lookup)),
      canCreateActivity: groups.some((g) => g.edit),
      canCreateEvent: groups.some((g) => g.book),
    };
  },

  /**
   * A page of events (cancelled ones too, marked): those not yet over, soonest
   * first, or those over, latest first. `more` tells whether there are others.
   */
  "events.list": async (when, skip) => {
    check(when, Match.OneOf("upcoming", "past"));
    check(skip, Match.Integer);
    await requireMember();
    const now = new Date();
    const upcoming = when === "upcoming";
    const found = await Events.find(
      upcoming ? { end: { $gte: now } } : { end: { $lt: now } },
      { sort: { start: upcoming ? 1 : -1 }, skip: Math.max(0, skip), limit: EVENTS_PAGE + 1 },
    ).fetchAsync();
    return { events: await eventViews(found.slice(0, EVENTS_PAGE)), more: found.length > EVENTS_PAGE };
  },

  /** One activity, its events from today on, and what the caller may do with it. */
  "activities.get": async (activityId) => {
    check(activityId, String);
    const who = await caller();
    const activity = await getActivity(activityId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const events = await Events.find({ activityId, end: { $gte: today } }, { sort: { start: 1 } }).fetchAsync();
    const access = await accessTo(who.member, activity.groupId, who);
    return {
      activity: activityView(activity, await lookups([activity])),
      events: await eventViews(events),
      canEdit: access.edit,
      canBook: access.book,
      // The activity as stored: for its edit form, and for what a new
      // event of it inherits.
      own: activity,
    };
  },

  /** One event, its hosts, and what the caller may do with it. */
  "events.get": async (eventId) => {
    check(eventId, String);
    const who = await caller();
    const event = await getEvent(eventId);
    const activity = event.activityId ? await Activities.findOneAsync(event.activityId) : null;
    const [view] = await eventViews([event]);
    const hosts = view.hostMemberIds.length
      ? await Members.find({ _id: { $in: view.hostMemberIds } }, { fields: { name: 1 } }).fetchAsync()
      : [];
    const access = await accessTo(who.member, eventGroupId(event, activity), who);
    return {
      event: view,
      hosts: hosts.map((m) => ({ _id: m._id, name: m.name })),
      activityName: activity?.name || null,
      canEdit: access.book,
      // The event as stored and its activity, for its edit form.
      own: access.book ? event : null,
      activity: access.book ? activity : null,
    };
  },

  /**
   * What the forms choose among: the groups the caller may create activities
   * for (`edit`) and book events for (`book`), the activities they may book
   * events of, the categories, workshops and spaces.
   */
  "activities.choices": async () => {
    const who = await caller();
    const groups = await myGroups(who);
    const bookable = groups.filter((g) => g.book).map((g) => g._id);
    const activities = await Activities.find(
      who.adminish ? {} : { groupId: { $in: bookable } },
      { fields: { name: 1, groupId: 1, durationMinutes: 1 }, sort: { "name.sv": 1 } },
    ).fetchAsync();
    const categories = await ActivityCategories.find({}, { sort: { sortOrder: 1, "name.sv": 1 } }).fetchAsync();
    const workshops = await Workshops.find({}, { fields: { name: 1, kind: 1 }, sort: { "name.sv": 1 } }).fetchAsync();
    const spaces = await Spaces.find({}, { fields: { name: 1 }, sort: { "name.sv": 1 } }).fetchAsync();
    return {
      adminish: who.adminish,
      groups,
      activities,
      categories: categories.map((c) => ({ _id: c._id, name: c.name })),
      workshops,
      spaces,
    };
  },

  /**
   * Who may host a group's events: its active members. For an event of the
   * association, board and admin choose among themselves: the caller.
   */
  "activities.hostChoices": async (groupId) => {
    check(groupId, Match.Maybe(String));
    const who = await caller();
    const access = await accessTo(who.member, groupId || null, who);
    if (!access.book) refuse();
    if (!groupId) return [{ _id: who.member._id, name: who.member.name }];
    const memberIds = (await GroupMemberships.find({ groupId, state: "active" }, { fields: { memberId: 1 } }).fetchAsync()).map((m) => m.memberId);
    const members = await Members.find({ _id: { $in: memberIds } }, { fields: { name: 1 }, sort: { name: 1 } }).fetchAsync();
    return members.map((m) => ({ _id: m._id, name: m.name }));
  },

  "activities.create": async (fields) => {
    check(fields, ActivityFields);
    const who = await caller();
    if (!(await accessTo(who.member, fields.groupId || null, who)).edit) refuse();
    return createActivity(fields, { userId: Meteor.userId() });
  },

  "activities.update": async (activityId, fields, expectedUpdatedAt) => {
    check(activityId, String);
    check(fields, ActivityFields);
    check(expectedUpdatedAt, Match.Maybe(Date));
    const who = await caller();
    const before = await getActivity(activityId);
    // Both the group it is in and the one it moves to.
    if (!(await accessTo(who.member, before.groupId, who)).edit) refuse();
    if (!(await accessTo(who.member, fields.groupId || null, who)).edit) refuse();
    await updateActivity(activityId, fields, { userId: Meteor.userId(), expectedUpdatedAt: expectedUpdatedAt ?? null });
  },

  "activities.remove": async (activityId) => {
    check(activityId, String);
    const who = await caller();
    const before = await getActivity(activityId);
    if (!(await accessTo(who.member, before.groupId, who)).edit) refuse();
    await removeActivity(activityId, { userId: Meteor.userId() });
  },

  "events.create": async (fields) => {
    check(fields, EventFields);
    const who = await caller();
    if (!(await accessTo(who.member, await groupOfFields(fields), who)).book) refuse();
    return createEvent(fields, { userId: Meteor.userId(), isAdminish: who.adminish });
  },

  "events.update": async (eventId, fields, expectedUpdatedAt) => {
    check(eventId, String);
    check(fields, EventFields);
    check(expectedUpdatedAt, Match.Maybe(Date));
    const who = await caller();
    const before = await getEvent(eventId);
    if (!(await accessTo(who.member, before.groupId || null, who)).book) refuse();
    if (!(await accessTo(who.member, await groupOfFields(fields), who)).book) refuse();
    await updateEvent(eventId, fields, { userId: Meteor.userId(), isAdminish: who.adminish, expectedUpdatedAt: expectedUpdatedAt ?? null });
  },

  "events.remove": async (eventId) => {
    check(eventId, String);
    const who = await caller();
    const before = await getEvent(eventId);
    if (!(await accessTo(who.member, before.groupId || null, who)).book) refuse();
    await removeEvent(eventId, { userId: Meteor.userId() });
  },
});
