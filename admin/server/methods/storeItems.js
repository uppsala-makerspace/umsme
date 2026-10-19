import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { StoreItems } from '/imports/common/collections/storeItems';
import { workshopImageStore } from '/imports/common/server/workshopImageStore';
import { requireRole, DOMAIN_ROLES } from '/imports/common/server/authz';
import { recordChange } from '/imports/common/server/auditLog';
import {
  createStoreItem,
  updateStoreItem,
  storeItemSales,
  removeStoreItem,
} from '/imports/common/server/storeItems/items';

const Bilingual = Match.Maybe({ sv: Match.Maybe(String), en: Match.Maybe(String) });
const Amount = Match.Maybe(Number);
const ItemFields = {
  code: String,
  name: { sv: String, en: Match.Maybe(String) },
  description: Match.Optional(Bilingual),
  price: Match.Optional(Amount),
  minPrice: Match.Optional(Amount),
  maxPrice: Match.Optional(Amount),
  requiresMembership: Match.Optional(Boolean),
  commentRequired: Match.Optional(Boolean),
  commentPlaceholder: Match.Optional(Bilingual),
  bookkeepingAccount: String,
  status: Match.Optional(Match.OneOf('available', 'hidden')),
  sortOrder: Match.Optional(Amount),
  workshopIds: Match.Optional([String]),
};

const roles = DOMAIN_ROLES.storeItems;

/**
 * Store item images. Twin of adminWorkshops.uploadImage/removeImage — same store,
 * same limits, same reason for requiring removal before deletion (the stored file
 * would otherwise be orphaned).
 */

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

Meteor.methods({
  async 'storeItems.create'(fields) {
    check(fields, ItemFields);
    await requireRole(this.userId, roles);
    return createStoreItem(fields, { userId: this.userId });
  },

  async 'storeItems.update'(docId, fields, expectedUpdatedAt) {
    check(docId, String);
    check(fields, ItemFields);
    check(expectedUpdatedAt, Match.Maybe(Date));
    await requireRole(this.userId, roles);
    await updateStoreItem(docId, fields, { userId: this.userId, expectedUpdatedAt: expectedUpdatedAt ?? null });
  },

  async 'storeItems.sales'(docId) {
    check(docId, String);
    await requireRole(this.userId, roles);
    return storeItemSales(docId);
  },

  async 'storeItems.remove'(docId) {
    check(docId, String);
    await requireRole(this.userId, roles);
    await removeStoreItem(docId, { userId: this.userId });
  },

  async 'adminStoreItems.uploadImage'(itemId, imageBase64, mimeType) {
    check(itemId, String);
    check(imageBase64, String);
    check(mimeType, String);
    await requireRole(this.userId, roles);
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
      $set: { imageFileId: fileId, imageMimeType: mimeType, updatedAt: new Date() },
    });
    if (previousFileId) await workshopImageStore.deleteImage(previousFileId);
    await recordChange({ userId: this.userId, domain: 'storeItems', action: 'uploadImage', docId: itemId, before: item, after: await StoreItems.findOneAsync(itemId) });
    return fileId;
  },

  async 'adminStoreItems.removeImage'(itemId) {
    check(itemId, String);
    await requireRole(this.userId, roles);
    const item = await StoreItems.findOneAsync(itemId);
    if (!item) throw new Meteor.Error('not-found', 'Store item not found');
    if (item.imageFileId) {
      await workshopImageStore.deleteImage(item.imageFileId);
      await StoreItems.updateAsync(itemId, {
        $set: { updatedAt: new Date() },
        $unset: { imageFileId: '', imageMimeType: '' },
      });
      await recordChange({ userId: this.userId, domain: 'storeItems', action: 'removeImage', docId: itemId, before: item, after: await StoreItems.findOneAsync(itemId) });
    }
    return true;
  },
});
