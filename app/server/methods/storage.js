import { Meteor } from "meteor/meteor";
import { check } from "meteor/check";
import { Members } from "/imports/common/collections/members";
import { findForUser, hasActiveLabMembership } from "/server/methods/utils";
import { publishManagerEvent, ManagerEventType } from "/imports/common/server/managerEvents";
import {
  memberAndStorageOwnerForUser,
  requirePayingStorageMember,
} from "/imports/common/server/storage/access";
import { storageMemberState } from "/imports/common/server/storage/memberState";
import {
  cancelMemberStorageRequest,
  confirmMemberStorageOffer,
  upsertMemberStorageRequest,
} from "/imports/common/server/storage/memberCommands";

Meteor.methods({
  async 'storage.member.getState'() {
    return storageMemberState(await memberAndStorageOwnerForUser(this.userId));
  },

  async 'storage.member.upsertRequest'({ request_type, preference, command_id }) {
    check(command_id, String);
    const { owner } = await requirePayingStorageMember(this.userId);
    const requestId = await upsertMemberStorageRequest({
      owner,
      requestType: request_type,
      preference,
      actor: this.userId,
      commandId: command_id,
    });
    await publishManagerEvent(ManagerEventType.BOX_REQUEST, {
      subject: `Storage request from ${owner.name}`,
      body: `type: \`${request_type}\`, request: \`${requestId}\``,
    });
    return { request_id: requestId };
  },

  async 'storage.member.cancelRequest'({ request_id, command_id }) {
    check(command_id, String);
    const { owner } = await requirePayingStorageMember(this.userId);
    await cancelMemberStorageRequest({ owner, requestId: request_id, actor: this.userId, commandId: command_id });
    return { success: true };
  },

  async 'storage.member.confirmOffer'({ offer_id }) {
    check(offer_id, String);
    const { owner } = await requirePayingStorageMember(this.userId);
    return confirmMemberStorageOffer({ owner, offerId: offer_id, actor: this.userId });
  },

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

    await publishManagerEvent(ManagerEventType.BOX_REQUEST, {
      subject: `Box request from ${member.name}`,
      body: `queue: \`${storagequeue ?? "—"}\`, request: \`${storagerequest ?? "—"}\``,
    });

    return { success: true };
  },
});
