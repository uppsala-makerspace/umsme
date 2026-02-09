import { Meteor } from "meteor/meteor";
import { Members } from "/imports/common/collections/members";
import { findForUser, hasActiveLabMembership } from "/server/methods/utils";

Meteor.methods({
  /**
   * Retrieves the storage attributes for the currently signed in user.
   * Only available to members with an active lab membership.
   * @returns {Promise<{ storage: any, storagequeue: any, storagerequest: any, hasLabMembership: boolean } | null>}
   */
  async storage() {
    if (!Meteor.userId()) {
      throw new Meteor.Error("not-authorized", "You must be logged in");
    }

    const { member } = await findForUser();
    if (!member) {
      return null;
    }

    const hasLab = await hasActiveLabMembership(member);

    let storageMember = member;
    let familyPayer = false;
    if (member.infamily) {
      storageMember = await Members.findOneAsync(member.infamily);
      familyPayer = true;
    }

    return {
      storage: storageMember.storage ?? null,
      storagequeue: storageMember.storagequeue ?? null,
      storagerequest: storageMember.storagerequest ?? null,
      hasLabMembership: hasLab,
      familyPayer,
    };
  },

  /**
   * Updates the storagequeue and/or storagerequest attributes for the currently signed in user.
   * Only allowed for members with an active lab membership.
   * @param {{ storagequeue?: any, storagerequest?: any }} updates
   * @returns {Promise<{ success: boolean }>}
   */
  async updateStorage({ storagequeue, storagerequest }) {
    if (!Meteor.userId()) {
      throw new Meteor.Error("not-authorized", "You must be logged in");
    }

    const { member } = await findForUser();
    if (!member) {
      throw new Meteor.Error("not-found", "No member found for user");
    }

    const hasLab = await hasActiveLabMembership(member);
    if (!hasLab) {
      throw new Meteor.Error("not-authorized", "Active lab membership required");
    }

    const $set = {};
    if (storagequeue !== undefined) {
      $set.storagequeue = storagequeue;
    }
    if (storagerequest !== undefined) {
      $set.storagerequest = storagerequest;
    }

    if (Object.keys($set).length === 0) {
      throw new Meteor.Error("invalid-arguments", "No valid fields to update");
    }

    await Members.updateAsync(member._id, { $set });

    return { success: true };
  },
});
