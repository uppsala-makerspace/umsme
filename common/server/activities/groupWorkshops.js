import { Groups } from '/imports/common/collections/groups';
import { Workshops } from '/imports/common/collections/workshops';
import { groupWorkshopIds } from '/imports/common/lib/activityRules';

/**
 * The workshop each group's activities are at when they name none
 * (groupWorkshopIds in common/lib/activityRules.js), read from the groups and
 * workshops as they are now: group id → workshop id.
 */
export const loadGroupWorkshops = async () => groupWorkshopIds(
  await Groups.find({}, { fields: { type: 1, parentGroupId: 1 } }).fetchAsync(),
  await Workshops.find({}, { fields: { groupId: 1, status: 1 } }).fetchAsync(),
);

/** The groups whose activities are at a workshop when they name none. */
export const groupsAtWorkshop = (groupWorkshops, workshopId) =>
  Object.keys(groupWorkshops).filter((groupId) => groupWorkshops[groupId] === workshopId);

/**
 * A selector for what is at a workshop, activities or events: those that
 * name it, and those that name none and belong to a group whose it is.
 */
export const atWorkshopSelector = (groupWorkshops, workshopId) => ({
  $or: [
    { workshopId },
    { workshopId: { $in: [null, ''] }, groupId: { $in: groupsAtWorkshop(groupWorkshops, workshopId) } },
  ],
});
