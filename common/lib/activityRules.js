/**
 * Pure (client + server safe) rules for activities and their events, per
 * plan/activities.md. An activity is something we usually do; an event is one
 * time it happens, of an activity or free-standing. Who may do what builds on
 * the group rules: editing an activity is editing its group, booking an event
 * is for every active member of the group, and board and admin always may.
 */
import { mayEditGroup } from "./groupRules";

export const EVENT_STATUSES = ["awaiting", "confirmed", "cancelled"];

// Who may create and change an activity's events: every active member of
// its group, or only those who may change the activity (mayEditActivity).
export const EVENT_BOOKERS = ["groupMembers", "activityEditors"];

// The fields an event shares with an activity: on an event of an activity
// they override the activity's, on a free-standing one they are its own.
// groupId is not among them: an event of an activity is always the activity's group's.
export const SHARED_FIELDS = [
  "name",
  "description",
  "categoryId",
  "imageFileId",
  "imageMimeType",
  "workshopId",
  "spaceId",
  "slackChannel",
  "contactEmail",
  "durationMinutes",
  "cost",
  "membersOnly",
  "published",
  "registration",
  "minSeats",
  "maxSeats",
  "queueAllowed",
  "infoRequired",
  "infoPlaceholder",
  "requiredCertificateId",
  "checkIn",
  "checkInOpensDaysBefore",
  "checkInOpensAt",
  "checkInClosesDaysBefore",
  "checkInClosesAt",
];

// Whether an event has a value of its own for a field. An empty text, and a
// text in neither language, is no value; false and 0 are.
const isSet = (value) => {
  if (value === undefined || value === null || value === "") return false;
  if (typeof value === "object" && !(value instanceof Date)) return !!(value.sv || value.en);
  return true;
};

/**
 * The fields of an event that it takes from its activity, because it has no
 * value of its own. None for a free-standing event.
 */
export const inheritedFields = (event, activity) =>
  activity ? SHARED_FIELDS.filter((f) => !isSet(event?.[f]) && isSet(activity[f])) : [];

/**
 * An event as it is shown: its own values, and the activity's where it has
 * none. A text in two languages is taken whole, never one language from each.
 * The image goes with its type, so both come from the same place.
 */
export const resolveEvent = (event, activity) => {
  if (!activity) return { ...event };
  const resolved = { ...event, groupId: activity.groupId };
  for (const field of inheritedFields(event, activity)) {
    if (field === "imageMimeType") continue;
    resolved[field] = activity[field];
    if (field === "imageFileId") resolved.imageMimeType = activity.imageMimeType;
  }
  if (!resolved.groupId) delete resolved.groupId;
  return resolved;
};

/** The group an event belongs to: its activity's, or its own when free-standing. */
export const eventGroupId = (event, activity) =>
  (activity ? activity.groupId : event?.groupId) || null;

/**
 * Whether someone may create, edit or remove an activity of a group: as for
 * editing the group (its responsible, or any member of a steering group),
 * and for an activity group (a responsibility group) also any member of the
 * steering group above it. One of the association's (no group) is for board
 * and admin only.
 *
 * @param {{isAdminish: boolean, group: object|null, isResponsible?: boolean, membershipState?: string|null,
 *          parentMembershipState?: string|null}} args
 *   `group` is the owning group, `membershipState` the person's in it and
 *   `parentMembershipState` the person's in the group's parent.
 */
export const mayEditActivity = ({ isAdminish, group, isResponsible = false, membershipState = null, parentMembershipState = null }) =>
  !!isAdminish ||
  (!!group && (
    mayEditGroup({ isResponsible, groupType: group.type, membershipState })
    || (group.type === "responsibility" && !!group.parentGroupId && parentMembershipState === "active")
  ));

/**
 * Whether someone may book, edit or cancel an event of a group: every active
 * member of it. One of the association's is for board and admin only.
 *
 * @param {{isAdminish: boolean, groupId: string|null, membershipState?: string|null}} args
 */
export const mayBookEvent = ({ isAdminish, groupId, membershipState = null }) =>
  !!isAdminish || (!!groupId && membershipState === "active");

/**
 * Whether someone may create or change an event of an activity: as for any
 * event of its group (mayBookEvent), unless the activity keeps its events to
 * those who may change it.
 *
 * @param {{activity: object, mayEdit: boolean, mayBook: boolean}} args
 *   `mayEdit` and `mayBook` are the person's, from mayEditActivity and mayBookEvent.
 */
export const mayBookEventOf = ({ activity, mayEdit, mayBook }) =>
  (activity?.eventBookers === "activityEditors" ? mayEdit : mayBook);

/**
 * The hosts that may not host: everyone not an active member of the event's
 * group. Board and admin may choose anyone.
 *
 * @param {{hostMemberIds: string[], groupMemberIds: string[], isAdminish: boolean}} args
 *   `groupMemberIds` are the group's active members.
 * @returns {string[]}
 */
export const disallowedHosts = ({ hostMemberIds = [], groupMemberIds = [], isAdminish }) =>
  isAdminish ? [] : hostMemberIds.filter((id) => !groupMemberIds.includes(id));

/** When an event of this length ends, or null when it has no length. */
export const eventEnd = (start, durationMinutes) =>
  start && durationMinutes > 0 ? new Date(start.getTime() + durationMinutes * 60000) : null;

// --- Registration (stage 2) and check-in and attendance (stage 3) ---------

export const REGISTRATIONS = ["none", "optional", "required"];
export const REGISTRATION_STATES = [
  "approved", "queued", "checkedIn", "attended", "missedCheckIn", "noShow", "withdrawn", "cancelled",
];
/** The states that hold a seat: what `seatsTaken` on the event counts. */
export const HOLDING = ["approved", "checkedIn", "attended"];
/** The states still in play before the event: a seat, or a place in the queue. */
export const PENDING = ["approved", "checkedIn", "queued"];

/** Whether one signs up for an event (resolved against its activity). */
export const takesRegistrations = (event) => (event?.registration || "none") !== "none";

/** Free seats; Infinity when the event has no limit. */
export const seatsLeft = (event, seatsTaken = 0) =>
  (event?.maxSeats ? Math.max(0, event.maxSeats - seatsTaken) : Infinity);

/** Whether one may sign up now: it takes registrations, is not called off and has not started. */
export const registrationOpen = (event, now = new Date()) =>
  takesRegistrations(event) && event.status !== "cancelled" && event.start > now;

/**
 * What a new registration becomes: a seat when one is free, whoever comes
 * first (the queue has no precedence, it is told when seats free up), else a
 * place in the queue when the event has one, else nothing.
 *
 * @returns {"approved"|"queued"|"full"}
 */
export const registrationOutcome = ({ event, seatsTaken = 0 }) => {
  if (seatsLeft(event, seatsTaken) > 0) return "approved";
  return event?.queueAllowed ? "queued" : "full";
};

/**
 * An event's status from its registrations: called off stays so; one waiting
 * for its fewest participants is `awaiting` until enough hold a seat, and then
 * `confirmed` for good (people plan by it, so it does not go back).
 */
export const statusFor = ({ event, seatsTaken = 0, current = "confirmed" }) => {
  if (current === "cancelled") return "cancelled";
  if (!takesRegistrations(event) || !(event.minSeats > 0) || current === "confirmed") return "confirmed";
  return seatsTaken >= event.minSeats ? "confirmed" : "awaiting";
};

/** The status a new event starts in, before anyone has signed up. */
export const initialStatus = (event) =>
  (takesRegistrations(event) && event.minSeats > 0 ? "awaiting" : "confirmed");

export const CHECK_INS = ["none", "default", "custom"];

/** The default check-in window: the day before the event, from 03:00 to 15:00. */
export const DEFAULT_CHECK_IN = Object.freeze({
  opensDaysBefore: 1, opensAt: "03:00", closesDaysBefore: 1, closesAt: "15:00",
});

/** Whether an event asks those with a seat to check in beforehand. */
export const checkInApplies = (event) =>
  takesRegistrations(event) && ["default", "custom"].includes(event?.checkIn);

/** The check-in window's settings in force: the default's, or the event's own. */
export const checkInSettings = (event) => (event?.checkIn === "custom"
  ? {
    opensDaysBefore: event.checkInOpensDaysBefore ?? DEFAULT_CHECK_IN.opensDaysBefore,
    opensAt: event.checkInOpensAt || DEFAULT_CHECK_IN.opensAt,
    closesDaysBefore: event.checkInClosesDaysBefore ?? DEFAULT_CHECK_IN.closesDaysBefore,
    closesAt: event.checkInClosesAt || DEFAULT_CHECK_IN.closesAt,
  }
  : { ...DEFAULT_CHECK_IN });

// The day `days` before the start's, at a time of day, local time.
const daysBefore = (start, days, clock) => {
  const [h, m] = clock.split(":").map(Number);
  return new Date(start.getFullYear(), start.getMonth(), start.getDate() - days, h, m);
};

/** When checking in opens and closes; it closes at the start at the latest. */
export const checkInWindow = (event) => {
  const s = checkInSettings(event);
  const closes = daysBefore(event.start, s.closesDaysBefore, s.closesAt);
  return {
    opens: daysBefore(event.start, s.opensDaysBefore, s.opensAt),
    closes: closes > event.start ? event.start : closes,
  };
};

/** How long before check-in closes those who have not checked in are reminded again. */
export const CHECK_IN_LAST_CALL_HOURS = 2;

/** When those with a seat who have not checked in are reminded a second time. */
export const checkInLastCall = (event) =>
  new Date(checkInWindow(event).closes.getTime() - CHECK_IN_LAST_CALL_HOURS * 3600000);

/** Whether a registration may check in now. */
export const mayCheckIn = (registration, event, now = new Date()) => {
  if (registration?.state !== "approved" || !checkInApplies(event) || event.status === "cancelled") return false;
  const { opens, closes } = checkInWindow(event);
  return now >= opens && now < closes;
};

/** Whether the check-in deadline has passed: a seat taken now is checked in at once. */
export const checkInClosed = (event, now = new Date()) =>
  checkInApplies(event) && now >= checkInWindow(event).closes;

/** Whether a member may withdraw: before the start, from a seat or the queue. */
export const mayWithdraw = (registration, event, now = new Date()) =>
  PENDING.includes(registration?.state) && event.start > now;

/** Whether a queued member may take a free seat now. */
export const mayTakeSeat = ({ registration, event, seatsTaken = 0, now = new Date() }) =>
  registration?.state === "queued" && event.status !== "cancelled" && event.start > now
  && seatsLeft(event, seatsTaken) > 0;

/** Whether attendance can be recorded: from the start on, until it is closed. */
export const attendanceOpen = (event, now = new Date()) =>
  event.status !== "cancelled" && takesRegistrations(event) && now >= event.start && !event.attendanceClosedAt;

