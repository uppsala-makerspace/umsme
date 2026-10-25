import { Activities } from '/imports/common/collections/activities';
import { Events } from '/imports/common/collections/events';
import { ActivityCategories } from '/imports/common/collections/activityCategories';
import { EventRegistrations } from '/imports/common/collections/eventRegistrations';
import { ActivityInterests } from '/imports/common/collections/activityInterests';

/** A category of activities. @returns {Promise<string>} its id */
export const makeCategory = (sv, en, sortOrder) =>
  ActivityCategories.insertAsync({ name: { sv, ...(en ? { en } : {}) }, sortOrder, updatedAt: new Date() });

/** An activity. @returns {Promise<string>} its id */
export const makeActivity = ({ createdAt = new Date(), ...fields }) =>
  Activities.insertAsync({ membersOnly: true, published: false, eventBookers: 'groupMembers', createdAt, updatedAt: createdAt, ...fields });

/**
 * An event, of `activity` (a document with _id, groupId and durationMinutes)
 * or free-standing. Its end is counted from the duration unless given, as the
 * domain functions do.
 *
 * @returns {Promise<string>} its id
 */
export const makeEvent = ({ activity = null, start, end, durationMinutes, createdAt = new Date(), ...fields }) => {
  const minutes = durationMinutes ?? activity?.durationMinutes ?? 120;
  return Events.insertAsync({
    ...(activity ? { activityId: activity._id, ...(activity.groupId ? { groupId: activity.groupId } : {}) } : {}),
    ...(durationMinutes ? { durationMinutes } : {}),
    start,
    end: end || new Date(start.getTime() + minutes * 60000),
    status: 'confirmed',
    hostMemberIds: [],
    createdAt,
    updatedAt: createdAt,
    ...fields,
  });
};

const HOLDING = ['approved', 'checkedIn', 'attended'];

/**
 * A member's registration to an event, in a state; one that holds a seat
 * counts on the event's `seatsTaken`, as the domain functions keep it.
 *
 * @returns {Promise<string>} its id
 */
export const makeRegistration = async (eventId, memberId, { state = 'approved', at = new Date(), info } = {}) => {
  const id = await EventRegistrations.insertAsync({
    eventId, memberId, state, registeredAt: at, stateChangedAt: at, ...(info ? { info } : {}),
  });
  if (HOLDING.includes(state)) await Events.updateAsync(eventId, { $inc: { seatsTaken: 1 } });
  return id;
};

/** A member's interest in an activity. */
export const makeInterest = (activityId, memberId, createdAt = new Date()) =>
  ActivityInterests.insertAsync({ activityId, memberId, createdAt });

