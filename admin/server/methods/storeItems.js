import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/roles';
import { StoreItems } from '/imports/common/collections/storeItems';
import { workshopImageStore } from '/imports/common/server/workshopImageStore';

/**
 * Store item images. Twin of adminWorkshops.uploadImage/removeImage — same store,
 * same limits, same reason for requiring removal before deletion (the stored file
 * would otherwise be orphaned).
 */

const requireRole = async (roles) => {
  if (!Meteor.userId() || !(await Roles.userIsInRoleAsync(Meteor.userId(), roles))) {
    throw new Meteor.Error('not-authorized', 'Insufficient role');
  }
};

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

Meteor.methods({
  'adminStoreItems.uploadImage': async (itemId, imageBase64, mimeType) => {
    await requireRole(['admin', 'board']);
    const item = await StoreItems.findOneAsync(itemId);
    if (!item) throw new Meteor.Error('not-found', 'Store item not found');
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new Meteor.Error('bad-type', 'Unsupported image type');
    }
    const buffer = Buffer.from(imageBase64, 'base64');
    if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) {
      throw new Meteor.Error('bad-size', 'Image is empty or larger than 10 MB');
    }

    const previousFileId = item.imageFileId;
    const fileId = await workshopImageStore.uploadImage({
      buffer,
      baseName: `storeitem-${itemId}-${Date.now()}`,
      mimeType,
      date: new Date(),
    });
    await StoreItems.updateAsync(itemId, {
      $set: { imageFileId: fileId, imageMimeType: mimeType },
    });
    if (previousFileId) await workshopImageStore.deleteImage(previousFileId);
    return fileId;
  },

  'adminStoreItems.removeImage': async (itemId) => {
    await requireRole(['admin', 'board']);
    const item = await StoreItems.findOneAsync(itemId);
    if (!item) throw new Meteor.Error('not-found', 'Store item not found');
    if (item.imageFileId) {
      await workshopImageStore.deleteImage(item.imageFileId);
      await StoreItems.updateAsync(itemId, {
        $unset: { imageFileId: '', imageMimeType: '' },
      });
    }
    return true;
  },
});
