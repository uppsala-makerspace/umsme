import { Meteor } from "meteor/meteor";
import { findForUser, hasActiveLabMembership } from "/server/methods/utils";
import { LiabilityDocuments } from "/imports/common/collections/liabilityDocuments";

const DOORS = ["outerDoor", "upperFloor", "lowerFloor"];

Meteor.methods({
  /**
   * Returns available doors if user is signed in and has an active lab membership.
   * @returns {Promise<string[]>} Array of door IDs or empty array if not authorized
   */
  availableDoors: async () => {
    if (!Meteor.userId()) {
      return [];
    }

    const { member } = await findForUser();
    const hasLab = await hasActiveLabMembership(member);

    return hasLab ? DOORS : [];
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

    const { member } = await findForUser();
    const hasLab = await hasActiveLabMembership(member);

    if (!hasLab) {
      throw new Meteor.Error("not-authorized", "No active lab membership");
    }

    // Check if member has approved the latest liability
    const latestLiability = await LiabilityDocuments.findOneAsync({}, { sort: { date: -1 } });
    if (latestLiability) {
      const memberLiabilityDate = member.liabilityDate;
      if (!memberLiabilityDate || memberLiabilityDate.getTime() !== latestLiability.date.getTime()) {
        throw new Meteor.Error("liability-not-approved", "You must approve the latest liability agreement");
      }
    }

    // TODO: Add actual door unlocking logic here
    console.log(`Door ${doorId} unlocked by user ${Meteor.userId()}`);

    return { success: true, message: `Door ${doorId} unlocked` };
  },
});
