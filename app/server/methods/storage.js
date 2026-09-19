import { Meteor } from "meteor/meteor";
import { check, Match } from "meteor/check";
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
    check(request_type, String);
    check(preference, Match.Maybe(Object));
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
    check(request_id, String);
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
});
