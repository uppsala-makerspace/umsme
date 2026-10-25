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
import { Certificates } from "/imports/common/collections/certificates";
import { EventRegistrations } from "/imports/common/collections/eventRegistrations";
import { ActivityInterests } from "/imports/common/collections/activityInterests";
import { activityImageUrlFor, eventImageUrlFor } from "/imports/common/server/workshopImage";
import {
  resolveEvent,
  eventGroupId,
  mayEditActivity,
  mayBookEvent,
  mayBookEventOf,
  takesRegistrations,
  registrationOpen,
  seatsLeft,
  mayWithdraw,
  mayTakeSeat,
  mayCheckIn,
  checkInApplies,
  checkInWindow,
  attendanceOpen,
  PENDING,
} from "/imports/common/lib/activityRules";
import {
  register, withdraw, takeSeat, checkIn, setInterest, markAttended, closeAttendance,
} from "/imports/common/server/activities/registrations";
import { hasValidCertificate } from "/imports/common/server/activities/certificates";
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
 * What a member may do with a group's activities and events; with `activity`,
 * with that activity's events, which it may keep to those who may change it.
 * Only an active member of the association may, besides board and admin.
 */
const accessTo = async (member, groupId, { adminish, active }, activity = null) => {
  if (adminish) return { edit: true, book: true };
  if (!active) return { edit: false, book: false };
  const group = groupId ? await Groups.findOneAsync(groupId) : null;
  const membershipState = await stateIn(groupId, member._id);
  const parentMembershipState = await stateIn(group?.parentGroupId, member._id);
  const edit = mayEditActivity({
    isAdminish: false, group, isResponsible: group?.responsibleMemberId === member._id, membershipState, parentMembershipState,
  });
  const book = mayBookEvent({ isAdminish: false, groupId: group?._id || null, membershipState });
  return { edit, book: mayBookEventOf({ activity, mayEdit: edit, mayBook: book }) };
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
    registration: resolved.registration || "none",
    maxSeats: resolved.maxSeats ?? null,
    seatsTaken: event.seatsTaken || 0,
    // null: no limit.
    seatsLeft: resolved.maxSeats ? seatsLeft(resolved, event.seatsTaken || 0) : null,
  };
};

const activitiesById = async (events) => {
  const ids = [...new Set(events.map((e) => e.activityId).filter(Boolean))];
  const docs = ids.length ? await Activities.find({ _id: { $in: ids } }).fetchAsync() : [];
  return new Map(docs.map((a) => [a._id, a]));
};

/**
 * Events as members see them, with what each refers to named; with
 * `memberId`, that member's registration state on each (`myState`).
 */
const eventViews = async (events, memberId = null) => {
  const activities = await activitiesById(events);
  const resolved = events.map((e) => resolveEvent(e, activities.get(e.activityId)));
  const lookup = await lookups(resolved);
  const mine = memberId
    ? new Map((await EventRegistrations.find({ memberId, eventId: { $in: events.map((e) => e._id) } }, { fields: { eventId: 1, state: 1 } }).fetchAsync())
      .map((r) => [r.eventId, r.state]))
    : new Map();
  return events.map((e) => ({ ...eventView(e, activities.get(e.activityId), lookup), myState: mine.get(e._id) || null }));
};

/**
 * What the event's page says about signing up, for this member: seats, the
 * queue, their own registration and what they may do with it, what it asks
 * for. Null for an event that takes no registrations.
 */
const registrationView = async (event, activity, member, now = new Date()) => {
  const resolved = resolveEvent(event, activity);
  if (!takesRegistrations(resolved)) return null;
  const mine = await EventRegistrations.findOneAsync({ eventId: event._id, memberId: member._id });
  const queued = await EventRegistrations.find({ eventId: event._id, state: "queued" }).countAsync();
  const seatsTaken = event.seatsTaken || 0;
  const certificate = resolved.requiredCertificateId
    ? await Certificates.findOneAsync(resolved.requiredCertificateId, { fields: { name: 1 } })
    : null;
  const window = checkInApplies(resolved) ? checkInWindow(resolved) : null;
  return {
    required: resolved.registration === "required",
    open: registrationOpen(resolved, now),
    seats: resolved.maxSeats ?? null,
    seatsLeft: resolved.maxSeats ? seatsLeft(resolved, seatsTaken) : null,
    queued,
    queueAllowed: !!resolved.queueAllowed,
    infoRequired: !!resolved.infoRequired,
    infoPlaceholder: resolved.infoPlaceholder || "",
    certificate: certificate
      ? { _id: certificate._id, name: certificate.name, held: await hasValidCertificate(member._id, certificate._id, now) }
      : null,
    checkIn: window ? { opens: window.opens, closes: window.closes } : null,
    mine: mine ? { state: mine.state, info: mine.info || "" } : null,
    canWithdraw: !!mine && mayWithdraw(mine, resolved, now),
    canTakeSeat: !!mine && mayTakeSeat({ registration: mine, event: resolved, seatsTaken, now }),
    canCheckIn: !!mine && mayCheckIn(mine, resolved, now),
  };
};

/** Whether the member hosts the event, or may record its attendance as board/admin. */
const mayRecordAttendance = (event, who) => who.adminish || (event.hostMemberIds || []).includes(who.member._id);

/** The event's participants for its hosts: names and states, those who withdrew left out. */
const participantsView = async (event) => {
  const registrations = await EventRegistrations.find(
    { eventId: event._id, state: { $nin: ["withdrawn", "cancelled"] } },
    { sort: { registeredAt: 1 } },
  ).fetchAsync();
  const members = await Members.find({ _id: { $in: registrations.map((r) => r.memberId) } }, { fields: { name: 1 } }).fetchAsync();
  const names = new Map(members.map((m) => [m._id, m.name]));
  return registrations.map((r) => ({ memberId: r.memberId, name: names.get(r.memberId) || "", state: r.state, info: r.info || "" }));
};

/** Only a member of the association signs up; board and admin always may. */
const requireActive = (who) => {
  if (!who.active) throw new Meteor.Error("not-authorized", "Only members of the association may sign up");
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

/** The group an event's fields put it in: its activity's, or its own. */
/** What may be done with an event of these fields: in its group, of its activity. */
const accessToFields = async (who, fields) => {
  const activity = fields.activityId ? await Activities.findOneAsync(fields.activityId) : null;
  if (fields.activityId && !activity) throw new Meteor.Error("not-found", "Activity not found");
  return accessTo(who.member, eventGroupId(fields, activity), who, activity);
};

/** What may be done with a stored event. */
const accessToEvent = async (who, event) => accessToFields(who, { ...event, groupId: event.activityId ? null : event.groupId });

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
    check(when, Match.OneOf("upcoming", "past", "mine"));
    check(skip, Match.Integer);
    const member = await requireMember();
    const now = new Date();
    const upcoming = when !== "past";
    let selector = upcoming ? { end: { $gte: now } } : { end: { $lt: now } };
    // Mine: those to come I have a seat at or queue for.
    if (when === "mine") {
      const ids = (await EventRegistrations.find({ memberId: member._id, state: { $in: PENDING } }, { fields: { eventId: 1 } }).fetchAsync())
        .map((r) => r.eventId);
      selector = { ...selector, _id: { $in: ids } };
    }
    const found = await Events.find(
      selector,
      { sort: { start: upcoming ? 1 : -1 }, skip: Math.max(0, skip), limit: EVENTS_PAGE + 1 },
    ).fetchAsync();
    return { events: await eventViews(found.slice(0, EVENTS_PAGE), member._id), more: found.length > EVENTS_PAGE };
  },

  /** One activity, its events from today on, and what the caller may do with it. */
  "activities.get": async (activityId) => {
    check(activityId, String);
    const who = await caller();
    const activity = await getActivity(activityId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const events = await Events.find({ activityId, end: { $gte: today } }, { sort: { start: 1 } }).fetchAsync();
    const access = await accessTo(who.member, activity.groupId, who, activity);
    return {
      activity: activityView(activity, await lookups([activity])),
      events: await eventViews(events, who.member._id),
      interested: !!(await ActivityInterests.findOneAsync({ activityId, memberId: who.member._id })),
      interestCount: await ActivityInterests.find({ activityId }).countAsync(),
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
    const access = await accessTo(who.member, eventGroupId(event, activity), who, activity);
    const hostsCanSee = mayRecordAttendance(event, who) || access.book;
    return {
      event: view,
      hosts: hosts.map((m) => ({ _id: m._id, name: m.name })),
      registration: await registrationView(event, activity, who.member),
      // The participants, for the event's hosts and those who may change it.
      participants: hostsCanSee ? await participantsView(event) : null,
      attendance: mayRecordAttendance(event, who)
        ? { open: attendanceOpen(resolveEvent(event, activity)), closed: !!event.attendanceClosedAt }
        : null,
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
    // The activities whose events the caller may book: in a group where they
    // may, and of one that keeps them to its editors, where they may edit.
    const access = new Map(groups.map((g) => [g._id, g]));
    const activities = (await Activities.find(
      who.adminish ? {} : { groupId: { $in: groups.map((g) => g._id) } },
      { fields: { name: 1, groupId: 1, durationMinutes: 1, eventBookers: 1 }, sort: { "name.sv": 1 } },
    ).fetchAsync()).filter((a) => who.adminish || mayBookEventOf({
      activity: a, mayEdit: access.get(a.groupId)?.edit, mayBook: access.get(a.groupId)?.book,
    }));
    const categories = await ActivityCategories.find({}, { sort: { sortOrder: 1, "name.sv": 1 } }).fetchAsync();
    const workshops = await Workshops.find({}, { fields: { name: 1, kind: 1 }, sort: { "name.sv": 1 } }).fetchAsync();
    const spaces = await Spaces.find({}, { fields: { name: 1 }, sort: { "name.sv": 1 } }).fetchAsync();
    const certificates = await Certificates.find({}, { fields: { name: 1 }, sort: { "name.sv": 1 } }).fetchAsync();
    return {
      adminish: who.adminish,
      groups,
      activities,
      categories: categories.map((c) => ({ _id: c._id, name: c.name })),
      workshops,
      spaces,
      certificates,
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
    if (!(await accessToFields(who, fields)).book) refuse();
    return createEvent(fields, { userId: Meteor.userId(), isAdminish: who.adminish });
  },

  "events.update": async (eventId, fields, expectedUpdatedAt) => {
    check(eventId, String);
    check(fields, EventFields);
    check(expectedUpdatedAt, Match.Maybe(Date));
    const who = await caller();
    const before = await getEvent(eventId);
    if (!(await accessToEvent(who, before)).book) refuse();
    if (!(await accessToFields(who, fields)).book) refuse();
    await updateEvent(eventId, fields, { userId: Meteor.userId(), isAdminish: who.adminish, expectedUpdatedAt: expectedUpdatedAt ?? null });
  },

  "events.remove": async (eventId) => {
    check(eventId, String);
    const who = await caller();
    const before = await getEvent(eventId);
    if (!(await accessToEvent(who, before)).book) refuse();
    await removeEvent(eventId, { userId: Meteor.userId() });
  },

  /** Sign up: a seat, or the queue (see register in common/server/activities/registrations.js). */
  "events.register": async (eventId, info) => {
    check(eventId, String);
    check(info, Match.Maybe(String));
    const who = await caller();
    requireActive(who);
    return register(eventId, who.member._id, { info: info || "", userId: Meteor.userId() });
  },

  "events.withdraw": async (eventId) => {
    check(eventId, String);
    const who = await caller();
    await withdraw(eventId, who.member._id, { userId: Meteor.userId() });
  },

  /** Take a seat that has become free, from the queue: the first to do so has it. */
  "events.takeSeat": async (eventId) => {
    check(eventId, String);
    const who = await caller();
    return takeSeat(eventId, who.member._id, { userId: Meteor.userId() });
  },

  "events.checkIn": async (eventId) => {
    check(eventId, String);
    const who = await caller();
    await checkIn(eventId, who.member._id, { userId: Meteor.userId() });
  },

  /** A host marks who came, or takes it back. */
  "events.markAttended": async (eventId, memberId, attended) => {
    check(eventId, String);
    check(memberId, String);
    check(attended, Boolean);
    const who = await caller();
    if (!mayRecordAttendance(await getEvent(eventId), who)) refuse();
    await markAttended(eventId, memberId, attended, { userId: Meteor.userId() });
  },

  /** A host closes the attendance: the rest did not come. */
  "events.closeAttendance": async (eventId) => {
    check(eventId, String);
    const who = await caller();
    if (!mayRecordAttendance(await getEvent(eventId), who)) refuse();
    return closeAttendance(eventId, { userId: Meteor.userId() });
  },

  /** Show interest in an activity, or stop. */
  "activities.setInterest": async (activityId, interested) => {
    check(activityId, String);
    check(interested, Boolean);
    const who = await caller();
    return setInterest(activityId, who.member._id, interested);
  },
});
