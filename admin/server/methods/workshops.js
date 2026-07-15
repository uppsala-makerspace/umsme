import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/roles';
import { Workshops } from '/imports/common/collections/workshops';
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
   * Set or replace a workshop's representative image (admin/board).
   * @param {string} workshopId
   * @param {string} imageBase64  Raw base64 (no data: prefix)
   * @param {string} mimeType
   */
  'adminWorkshops.uploadImage': async (workshopId, imageBase64, mimeType) => {
    await requireRole(['admin', 'board']);
    const workshop = await Workshops.findOneAsync(workshopId);
    if (!workshop) throw new Meteor.Error('not-found', 'Workshop not found');
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new Meteor.Error('bad-type', 'Unsupported image type');
    }
    const buffer = Buffer.from(imageBase64, 'base64');
    if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) {
      throw new Meteor.Error('bad-size', 'Image is empty or larger than 10 MB');
    }

    const previousFileId = workshop.imageFileId;
    const fileId = await workshopImageStore.uploadImage({
      buffer,
      baseName: `workshop-${workshopId}-${Date.now()}`,
      mimeType,
      date: new Date(),
    });
    await Workshops.updateAsync(workshopId, {
      $set: { imageFileId: fileId, imageMimeType: mimeType },
    });
    if (previousFileId) await workshopImageStore.deleteImage(previousFileId);
    return fileId;
  },

  /**
   * Remove a workshop's image (admin/board). Required before the workshop
   * itself can be deleted (see the deny rule on Workshops).
   */
  'adminWorkshops.removeImage': async (workshopId) => {
    await requireRole(['admin', 'board']);
    const workshop = await Workshops.findOneAsync(workshopId);
    if (!workshop) throw new Meteor.Error('not-found', 'Workshop not found');
    if (workshop.imageFileId) {
      await workshopImageStore.deleteImage(workshop.imageFileId);
      await Workshops.updateAsync(workshopId, {
        $unset: { imageFileId: '', imageMimeType: '' },
      });
    }
    return true;
  },
});
