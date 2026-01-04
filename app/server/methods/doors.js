import { Meteor } from "meteor/meteor";
import { memberStatus } from "/imports/common/lib/utils";
import { findForUser } from "/server/methods/utils";
import { Members } from "/imports/common/collections/members";

const DOORS = ["outerDoor", "upperFloor", "lowerFloor"];

/**
 * Gets the lab end date for the current user.
 * @returns {Promise<Date|null>} The lab end date or null if not found
 */
const getLabEndForUser = async () => {
  if (!Meteor.userId()) {
    return null;
  }

  const info = await findForUser();
  if (!info.member) {
    return null;
  }

  // Get the paying member for family memberships
  const paying = info.member.infamily
    ? await Members.findOneAsync(info.member.infamily)
    : info.member;

  const status = await memberStatus(paying);
  return status.labEnd || null;
};

Meteor.methods({
  /**
   * Returns available doors if user is signed in and has an active lab membership.
   * @returns {Promise<string[]>} Array of door IDs or empty array if not authorized
   */
  availableDoors: async () => {
    const labEnd = await getLabEndForUser();

    if (labEnd && labEnd > new Date()) {
      return DOORS;
    }

    return [];
  },

  /**
   * Unlocks a specific door if the user has permission.
   * @param {string} doorId - The ID of the door to unlock
   * @returns {Promise<{success: boolean, message: string}>}
   */
  unlockDoor: async (doorId) => {
    if (!Meteor.userId()) {
      throw new Meteor.Error("not-authorized", "You must be logged in");
    }

    if (!DOORS.includes(doorId)) {
      throw new Meteor.Error("invalid-door", "Invalid door ID");
    }

    const labEnd = await getLabEndForUser();

    if (!labEnd || labEnd <= new Date()) {
      throw new Meteor.Error("not-authorized", "No active lab membership");
    }

    // TODO: Add actual door unlocking logic here
    console.log(`Door ${doorId} unlocked by user ${Meteor.userId()}`);

    return { success: true, message: `Door ${doorId} unlocked` };
  },
});
