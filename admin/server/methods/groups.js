import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { Groups } from '/imports/common/collections/groups';
import { workshopImageStore } from '/imports/common/server/workshopImageStore';
import { requireRole, DOMAIN_ROLES } from '/imports/common/server/authz';
import { recordChange } from '/imports/common/server/auditLog';
import {
  createGroup, updateGroup, removeGroup, groupReferences,
  addGroupMember, rejectGroupRequest, removeGroupMember,
} from '/imports/common/server/groups/groups';

const roles = DOMAIN_ROLES.groups;
const Bilingual = Match.Maybe({ sv: Match.Maybe(String), en: Match.Maybe(String) });
const Id = Match.Maybe(String);
const GroupFields = {
  name: { sv: String, en: Match.Maybe(String) },
  tag: Match.Optional(Bilingual),
  description: Match.Optional(Bilingual),
  rules: Match.Optional(Bilingual),
  type: String,
  slackChannel: Match.Optional(Match.Maybe(String)),
  guidesUrl: Match.Optional(Match.Maybe(String)),
  responsibleMemberId: Match.Optional(Id),
  parentGroupId: Match.Optional(Id),
  relatedWorkshopIds: Match.Optional([String]),
  relatedGroupIds: Match.Optional([String]),
  allowJoinRequests: Match.Optional(Boolean),
  joinPolicy: Match.Optional(String),
  primarySpaceId: Match.Optional(Id),
  secondarySpaceIds: Match.Optional([String]),
  linkedRole: Match.Optional(Id),
};

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

Meteor.methods({
  async 'groups.create'(fields) {
    check(fields, GroupFields);
    await requireRole(this.userId, roles);
    return createGroup(fields, { userId: this.userId });
  },

  async 'groups.update'(docId, fields, expectedUpdatedAt) {
    check(docId, String);
    check(fields, GroupFields);
    check(expectedUpdatedAt, Match.Maybe(Date));
    await requireRole(this.userId, roles);
    await updateGroup(docId, fields, { userId: this.userId, expectedUpdatedAt: expectedUpdatedAt ?? null });
  },

  async 'groups.references'(docId) {
    check(docId, String);
    await requireRole(this.userId, roles);
    return groupReferences(docId);
  },

  async 'groups.remove'(docId) {
    check(docId, String);
    await requireRole(this.userId, roles);
    await removeGroup(docId, { userId: this.userId });
  },

  /** Add a member, or approve their request to join. */
  async 'groups.addMember'(groupId, memberId) {
    check(groupId, String);
    check(memberId, String);
    await requireRole(this.userId, roles);
    await addGroupMember(groupId, memberId, { userId: this.userId });
  },

  async 'groups.rejectRequest'(groupId, memberId) {
    check(groupId, String);
    check(memberId, String);
    await requireRole(this.userId, roles);
    await rejectGroupRequest(groupId, memberId, { userId: this.userId });
  },

  async 'groups.removeMember'(groupId, memberId) {
    check(groupId, String);
    check(memberId, String);
    await requireRole(this.userId, roles);
    await removeGroupMember(groupId, memberId, { userId: this.userId });
  },

  /** Set or replace a group's representative image. */
  async 'adminGroups.uploadImage'(groupId, imageBase64, mimeType) {
    check(groupId, String);
    check(imageBase64, String);
    check(mimeType, String);
    await requireRole(this.userId, roles);
    const group = await Groups.findOneAsync(groupId);
    if (!group) throw new Meteor.Error('not-found', 'Group not found');
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) throw new Meteor.Error('bad-type', 'Unsupported image type');
    const buffer = Buffer.from(imageBase64, 'base64');
    if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) {
      throw new Meteor.Error('bad-size', 'Image is empty or larger than 10 MB');
    }
    const fileId = await workshopImageStore.uploadImage({
      buffer, baseName: `group-${groupId}-${Date.now()}`, mimeType, date: new Date(),
    });
    await Groups.updateAsync(groupId, { $set: { imageFileId: fileId, imageMimeType: mimeType, updatedAt: new Date() } });
    if (group.imageFileId) await workshopImageStore.deleteImage(group.imageFileId);
    await recordChange({ userId: this.userId, domain: 'groups', action: 'uploadImage', docId: groupId, before: group, after: await Groups.findOneAsync(groupId) });
    return fileId;
  },

  /** Remove a group's image; needed before the group can be deleted. */
  async 'adminGroups.removeImage'(groupId) {
    check(groupId, String);
    await requireRole(this.userId, roles);
    const group = await Groups.findOneAsync(groupId);
    if (!group) throw new Meteor.Error('not-found', 'Group not found');
    if (group.imageFileId) {
      await workshopImageStore.deleteImage(group.imageFileId);
      await Groups.updateAsync(groupId, { $set: { updatedAt: new Date() }, $unset: { imageFileId: '', imageMimeType: '' } });
      await recordChange({ userId: this.userId, domain: 'groups', action: 'removeImage', docId: groupId, before: group, after: await Groups.findOneAsync(groupId) });
    }
    return true;
  },
});
