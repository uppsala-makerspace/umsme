/**
 * Pure (client + server safe) rules for activities and their events, per
 * plan/activities.md. An activity is something we usually do; an event is one
 * time it happens, of an activity or free-standing. Who may do what builds on
 * the group rules: editing an activity is editing its group, booking an event
 * is for every active member of the group, and board and admin always may.
 */
import { mayEditGroup } from "./groupRules";

export const EVENT_STATUSES = ["confirmed", "cancelled"];

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
