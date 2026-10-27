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
import { Attestations } from "/imports/common/collections/attestations";
import { metCertificateIds } from "/imports/common/lib/rules";
import { canCertify } from "/imports/common/server/certificates/canCertify";
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
  registerAgainAt,
  checkInApplies,
  checkInWindow,
  attendanceOpen,
  PENDING,
} from "/imports/common/lib/activityRules";
import {
  register, withdraw, takeSeat, checkIn, setInterest, markAttended, closeAttendance, addAttendee, giveCertificate,
} from "/imports/common/server/activities/registrations";
import { hasValidCertificate } from "/imports/common/server/activities/certificates";
import {
  createActivity, updateActivity, removeActivity, setActivityImage, removeActivityImage,
} from "/imports/common/server/activities/activities";
import {
  createEvent, updateEvent, removeEvent, setEventImage, removeEventImage,
} from "/imports/common/server/activities/events";
import { findMemberForUser, isActiveMember, hasPaidMembership } from "./utils";
import { zonedDayAt } from "/imports/common/lib/days";

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
  const planned = await plannedEventCounts(activities.map((a) => a._id));
  return activities.map((activity) => ({ ...activity, plannedEvents: planned.get(activity._id) || 0 }));
};

/** How many events each activity has planned, to come and not cancelled, by its id: in one query. */
const plannedEventCounts = async (activityIds) => {
  const counts = new Map();
  if (!activityIds.length) return counts;
  const events = await Events.find(
    { activityId: { $in: activityIds }, end: { $gte: new Date() }, status: { $ne: "cancelled" } },
    { fields: { activityId: 1 } },
  ).fetchAsync();
  for (const { activityId } of events) counts.set(activityId, (counts.get(activityId) || 0) + 1);
  return counts;
};

/**
 * The events to come shown at a workshop or area of interest, soonest first:
 * its own, and those of its activities that do not say otherwise.
 */
export const upcomingEventsAt = async (workshopId, memberId, limit = 10) => {
  const activityIds = (await Activities.find({ workshopId }, { fields: { _id: 1 } }).fetchAsync()).map((a) => a._id);
  const events = await Events.find(
    {
      end: { $gte: new Date() },
      $or: [{ workshopId }, { activityId: { $in: activityIds }, workshopId: { $exists: false } }],
    },
    { sort: { start: 1 }, limit },
  ).fetchAsync();
  return eventViews(events, memberId);
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
  certificates: await names(Certificates, docs.flatMap((d) => [d.requiredCertificateId, d.targetCertificateId])),
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
  // Only when one signs up: the certificate one must hold to.
  requiredCertificate: (doc.registration || "none") !== "none" && doc.requiredCertificateId
    ? { _id: doc.requiredCertificateId, name: lookup.certificates.get(doc.requiredCertificateId) || null }
    : null,
  // The certificate it gives: by a host to those who came, or when one asks.
  targetCertificate: doc.targetCertificateId
    ? { _id: doc.targetCertificateId, name: lookup.certificates.get(doc.targetCertificateId) || null }
    : null,
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
const registrationView = async (event, activity, who, now = new Date()) => {
  const { member } = who;
  const resolved = resolveEvent(event, activity);
  if (!takesRegistrations(resolved)) return null;
  const mayRegister = await maySignUp(who);
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
    // Only one with a paid membership signs up, accepted by the board or not yet (board and admin always).
    member: mayRegister,
    // Why not, when not: excluded or noMembership.
    notMemberReason: mayRegister ? null : (member.excluded ? "excluded" : "noMembership"),
    mine: mine ? { state: mine.state, info: mine.info || "" } : null,
    canWithdraw: !!mine && mayWithdraw(mine, resolved, now),
    canTakeSeat: !!mine && mayTakeSeat({ registration: mine, event: resolved, seatsTaken, now }),
    canCheckIn: !!mine && mayCheckIn(mine, resolved, now),
    // Gave up a seat a moment ago: may sign up again from then.
    registerAgainAt: registerAgainAt(mine, now),
  };
};

/**
 * Whether the member may keep the event's attendance (mark who came, add who
 * came, close it): its hosts, those who may change it, and board/admin.
 */
const mayRecordAttendance = async (event, who) => who.adminish
  || (event.hostMemberIds || []).includes(who.member._id)
  || (await accessToEvent(who, event)).book;

/**
 * The event's participants for its hosts: names and states, those who withdrew
 * left out. With a certificate it gives, where each stands with it: `held` or
 * `pending`, with the attestation's id (the latest held, or the request).
 */
const participantsView = async (event, resolved) => {
  const registrations = await EventRegistrations.find(
    { eventId: event._id, state: { $nin: ["withdrawn", "cancelled"] } },
    { sort: { registeredAt: 1 } },
  ).fetchAsync();
  const memberIds = registrations.map((r) => r.memberId);
  const members = await Members.find({ _id: { $in: memberIds } }, { fields: { name: 1 } }).fetchAsync();
  const names = new Map(members.map((m) => [m._id, m.name]));
  const certificateId = resolved.targetCertificateId;
  const attestations = certificateId
    ? await Attestations.find({ certificateId, memberId: { $in: memberIds } }).fetchAsync()
    : [];
  const standing = (memberId) => {
    const own = attestations.filter((a) => a.memberId === memberId);
    const held = own.filter((a) => metCertificateIds([a]).has(certificateId))
      .sort((a, b) => (b.confirmedAt || b.startDate) - (a.confirmedAt || a.startDate))[0];
    if (held) return { certificate: "held", attestationId: held._id };
    const pending = own.find((a) => !a.certifierId);
    return pending ? { certificate: "pending", attestationId: pending._id } : { certificate: null };
  };
  return registrations.map((r) => ({
    memberId: r.memberId, name: names.get(r.memberId) || "", state: r.state, info: r.info || "",
    ...(certificateId ? standing(r.memberId) : {}),
  }));
};

/**
 * For the hosts of an event that gives a certificate: whether the caller may
 * give it, and whether none of its hosts may.
 */
const certificateView = async (resolved, who) => {
  if (!resolved.targetCertificateId) return null;
  const certificate = await Certificates.findOneAsync(resolved.targetCertificateId);
  if (!certificate) return null;
  let hostMayCertify = false;
  for (const memberId of resolved.hostMemberIds || []) {
    if (await canCertify(memberId, certificate)) { hostMayCertify = true; break; }
  }
  return {
    _id: certificate._id, name: certificate.name,
    mayCertify: await canCertify(who.member._id, certificate), noCertifierHost: !hostMayCertify,
  };
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Only one with a paid membership signs up, whether or not the board has
 * accepted them yet; board and admin always may.
 */
const maySignUp = async (who) => who.adminish || (await hasPaidMembership(who.member));

const requireMaySignUp = async (who) => {
  if (!(await maySignUp(who))) throw new Meteor.Error("not-member", "Only members of the association may sign up");
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

/** The group an event's fields put it in: its activity's, or its own. */
/**
 * What may be done with an event of these fields: in its group, of its
 * activity. A free-standing event is like an activity of its own, so only
 * those who may create activities in its group create and change it.
 */
const accessToFields = async (who, fields) => {
  const activity = fields.activityId ? await Activities.findOneAsync(fields.activityId) : null;
  if (fields.activityId && !activity) throw new Meteor.Error("not-found", "Activity not found");
  const access = await accessTo(who.member, eventGroupId(fields, activity), who, activity);
  return activity ? access : { ...access, book: access.edit };
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
    const planned = await plannedEventCounts(activities.map((a) => a._id));
    return {
      activities: activities.map((a) => ({ ...activityView(a, lookup), plannedEvents: planned.get(a._id) || 0 })),
      canCreateActivity: groups.some((g) => g.edit),
    };
  },

  /** Whether the caller may add a free-standing event, the calendar's New event: as an activity (see accessToFields). */
  "events.mayCreate": async () => (await myGroups(await caller())).some((g) => g.edit),

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
    const today = zonedDayAt(new Date());
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
    const access = await accessToEvent(who, event);
    const keepsAttendance = await mayRecordAttendance(event, who);
    const hostsCanSee = keepsAttendance || access.book;
    const resolved = resolveEvent(event, activity);
    return {
      event: view,
      hosts: hosts.map((m) => ({ _id: m._id, name: m.name })),
      registration: await registrationView(event, activity, who),
      // The participants, for the event's hosts and those who may change it.
      participants: hostsCanSee ? await participantsView(event, resolved) : null,
      // For those who keep the attendance; adding who came by name is for board/admin.
      attendance: keepsAttendance
        ? { open: attendanceOpen(resolved), closed: !!event.attendanceClosedAt, searchByName: who.adminish }
        : null,
      // For those who see the participants: the certificate the event gives.
      certificate: hostsCanSee ? await certificateView(resolved, who) : null,
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
    await requireMaySignUp(who);
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
    if (!(await mayRecordAttendance(await getEvent(eventId), who))) refuse();
    await markAttended(eventId, memberId, attended, { userId: Meteor.userId() });
  },

  /** A host closes the attendance: the rest did not come. */
  "events.closeAttendance": async (eventId) => {
    check(eventId, String);
    const who = await caller();
    if (!(await mayRecordAttendance(await getEvent(eventId), who))) refuse();
    return closeAttendance(eventId, { userId: Meteor.userId() });
  },

  /**
   * Members to add as come, for those who keep the attendance: by membership
   * number, or, for board and admin, by name too (at most ten).
   */
  "events.findMembers": async (eventId, query) => {
    check(eventId, String);
    check(query, String);
    const who = await caller();
    if (!(await mayRecordAttendance(await getEvent(eventId), who))) refuse();
    const wanted = query.trim();
    if (!wanted) return [];
    const selector = /^\d+$/.test(wanted) || !who.adminish
      ? { mid: wanted }
      : { name: { $regex: escapeRegex(wanted), $options: "i" } };
    const found = await Members.find(selector, { fields: { name: 1, mid: 1 }, sort: { name: 1 }, limit: 10 }).fetchAsync();
    return found.map((m) => ({ _id: m._id, name: m.name, mid: m.mid }));
  },

  /** A host adds a member who came, as come (see addAttendee). */
  "events.addAttendee": async (eventId, memberId) => {
    check(eventId, String);
    check(memberId, String);
    const who = await caller();
    if (!(await mayRecordAttendance(await getEvent(eventId), who))) refuse();
    await addAttendee(eventId, memberId, { userId: Meteor.userId() });
  },

  /** A host who may certify gives the event's certificate to one who came (see giveCertificate). */
  "events.giveCertificate": async (eventId, memberId) => {
    check(eventId, String);
    check(memberId, String);
    const who = await caller();
    if (!(await mayRecordAttendance(await getEvent(eventId), who))) refuse();
    return giveCertificate(eventId, memberId, { userId: Meteor.userId(), certifierMemberId: who.member._id });
  },

  /** Show interest in an activity, or stop. */
  "activities.setInterest": async (activityId, interested) => {
    check(activityId, String);
    check(interested, Boolean);
    const who = await caller();
    return setInterest(activityId, who.member._id, interested);
  },

  /** Set or replace an activity's image: for those who may change it. */
  "activities.uploadImage": async (activityId, imageBase64, mimeType) => {
    check(activityId, String);
    check(imageBase64, String);
    check(mimeType, String);
    const who = await caller();
    if (!(await accessTo(who.member, (await getActivity(activityId)).groupId, who)).edit) refuse();
    return setActivityImage(activityId, { imageBase64, mimeType }, { userId: Meteor.userId() });
  },

  "activities.removeImage": async (activityId) => {
    check(activityId, String);
    const who = await caller();
    if (!(await accessTo(who.member, (await getActivity(activityId)).groupId, who)).edit) refuse();
    await removeActivityImage(activityId, { userId: Meteor.userId() });
  },

  /** Set or replace an event's own image: for those who may change the event. */
  "events.uploadImage": async (eventId, imageBase64, mimeType) => {
    check(eventId, String);
    check(imageBase64, String);
    check(mimeType, String);
    const who = await caller();
    if (!(await accessToEvent(who, await getEvent(eventId))).book) refuse();
    return setEventImage(eventId, { imageBase64, mimeType }, { userId: Meteor.userId() });
  },

  /** Remove an event's own image: it shows its activity's again, if any. */
  "events.removeImage": async (eventId) => {
    check(eventId, String);
    const who = await caller();
    if (!(await accessToEvent(who, await getEvent(eventId))).book) refuse();
    await removeEventImage(eventId, { userId: Meteor.userId() });
  },
});

