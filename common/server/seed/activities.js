import { Activities } from '/imports/common/collections/activities';
import { Events } from '/imports/common/collections/events';
import { ActivityCategories } from '/imports/common/collections/activityCategories';

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
