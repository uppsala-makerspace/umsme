import { Meteor } from "meteor/meteor";
import { fetch } from "meteor/fetch";
import { findForUser, hasActiveLabMembership } from "/server/methods/utils";
import { LiabilityDocuments } from "/imports/common/collections/liabilityDocuments";

const getHomeAssistantConfig = () => {
  const config = Meteor.settings.private?.homeAssistant;
  if (!config) {
    throw new Meteor.Error("config-missing", "Home Assistant configuration not found in settings");
  }
  return config;
};

const getLocks = () => {
  const config = getHomeAssistantConfig();
  return config.locks || [];
};

Meteor.methods({
  /**
   * Returns available doors with their locations if user has an active lab membership.
   * Does not expose sensitive data like entityId, type, token, or url.
   * @returns {Promise<{ proximityRange: number, doors: Array<{ id: string, location: { lat: number, long: number } | null }> }>}
   */
  availableDoors: async () => {
    const config = Meteor.settings.private?.homeAssistant;
    const proximityRange = config?.proximityRange || 100;

    if (!Meteor.userId()) {
      return { proximityRange, doors: [] };
    }

    const { member } = await findForUser();
    const hasLab = await hasActiveLabMembership(member);

    if (!hasLab) {
      return { proximityRange, doors: [] };
    }

    const locks = getLocks();
    const doors = locks.map(lock => ({
      id: lock.id,
      location: lock.location || null,
    }));

    return { proximityRange, doors };
  },

  /**
   * Unlocks a specific lock if the user has permission.
   * @param {string} lockId - The ID of the lock to unlock
   * @returns {Promise<{success: boolean, message: string}>}
   */
  unlockDoor: async (lockId) => {
    if (!Meteor.userId()) {
      throw new Meteor.Error("not-authorized", "You must be logged in");
    }

    const locks = getLocks();
    const lock = locks.find(l => l.id === lockId);

    if (!lock) {
      throw new Meteor.Error("invalid-lock", "Invalid lock ID");
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

    // Call Home Assistant API to unlock
    const config = getHomeAssistantConfig();
    const service = lock.type === "switch" ? "switch/turn_on" : "lock/unlock";
    const response = await fetch(`${config.url}/api/services/${service}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ entity_id: lock.entityId }),
    });

    if (!response.ok) {
      console.error(`Failed to unlock ${lockId}: ${response.status} ${response.statusText}`);
      throw new Meteor.Error("unlock-failed", "Failed to unlock door");
    }

    console.log(`Lock ${lockId} (${lock.entityId}) unlocked by user ${Meteor.userId()}`);

    return { success: true, message: `Lock ${lockId} unlocked` };
  },
});
