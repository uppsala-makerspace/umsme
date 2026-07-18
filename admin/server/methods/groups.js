import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/roles';
import { Groups } from '/imports/common/collections/groups';
import { syncLinkedRoleById } from '/imports/common/server/linkedRoleSync';
import { workshopImageStore } from '/imports/common/server/workshopImageStore';

const requireRole = async (roles) => {
  if (!Meteor.userId() || !(await Roles.userIsInRoleAsync(Meteor.userId(), roles))) {
    throw new Meteor.Error('not-authorized', 'Insufficient role');
  }
};

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

Meteor.methods({
  /**
   * Re-sync a group's linked role from its active membership. Called by the
   * admin UI after membership edits or after the group form is saved (the
   * linkedRole field may have changed). Group membership is the source of
   * truth for linked roles — manual role edits are overwritten here.
   */
  'adminGroups.syncLinkedRole': async (groupId) => {
    await requireRole(['admin', 'board']);
    await syncLinkedRoleById(groupId);
    return true;
  },

  /**
   * Set or replace a group's representative image (admin/board). Mirrors
   * adminWorkshops.uploadImage.
   * @param {string} groupId
   * @param {string} imageBase64  Raw base64 (no data: prefix)
   * @param {string} mimeType
   */
  'adminGroups.uploadImage': async (groupId, imageBase64, mimeType) => {
    await requireRole(['admin', 'board']);
    const group = await Groups.findOneAsync(groupId);
    if (!group) throw new Meteor.Error('not-found', 'Group not found');
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new Meteor.Error('bad-type', 'Unsupported image type');
    }
    const buffer = Buffer.from(imageBase64, 'base64');
    if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) {
      throw new Meteor.Error('bad-size', 'Image is empty or larger than 10 MB');
    }

    const previousFileId = group.imageFileId;
    const fileId = await workshopImageStore.uploadImage({
      buffer,
      baseName: `group-${groupId}-${Date.now()}`,
      mimeType,
      date: new Date(),
    });
    await Groups.updateAsync(groupId, {
      $set: { imageFileId: fileId, imageMimeType: mimeType },
    });
    if (previousFileId) await workshopImageStore.deleteImage(previousFileId);
    return fileId;
  },

  /**
   * Remove a group's image (admin/board). Required before the group itself
   * can be deleted (see the deny rule on Groups).
   */
  'adminGroups.removeImage': async (groupId) => {
    await requireRole(['admin', 'board']);
    const group = await Groups.findOneAsync(groupId);
    if (!group) throw new Meteor.Error('not-found', 'Group not found');
    if (group.imageFileId) {
      await workshopImageStore.deleteImage(group.imageFileId);
      await Groups.updateAsync(groupId, {
        $unset: { imageFileId: '', imageMimeType: '' },
      });
    }
    return true;
  },
});
