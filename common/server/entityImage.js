import { Meteor } from "meteor/meteor";
import { workshopImageStore } from "./workshopImageStore";

// Shared image handling for entities with imageFileId/imageMimeType fields
// (workshops and groups), stored via workshopImageStore. Used by the app's
// group-responsible editing methods; the admin methods predate this and keep
// their own inline copies.
export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
];
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/**
 * Validate a base64 image, store it, point the doc's imageFileId/imageMimeType
 * at it, and delete the previously stored file. Returns the new fileId.
 *
 * @param {Mongo.Collection} collection
 * @param {object} doc  The current document (needs _id and imageFileId)
 * @param {{ imageBase64: string, mimeType: string, baseName: string }} opts
 */
export const setEntityImage = async (collection, doc, { imageBase64, mimeType, baseName }) => {
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(mimeType)) {
    throw new Meteor.Error("bad-type", "Unsupported image type");
  }
  const buffer = Buffer.from(imageBase64, "base64");
  if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) {
    throw new Meteor.Error("bad-size", "Image is empty or larger than 10 MB");
  }
  const previousFileId = doc.imageFileId;
  const fileId = await workshopImageStore.uploadImage({
    buffer,
    baseName,
    mimeType,
    date: new Date(),
  });
  await collection.updateAsync(doc._id, {
    $set: { imageFileId: fileId, imageMimeType: mimeType },
  });
  if (previousFileId) await workshopImageStore.deleteImage(previousFileId);
  return fileId;
};

/** Remove an entity's stored image and clear its image fields. */
export const clearEntityImage = async (collection, doc) => {
  if (doc.imageFileId) {
    await workshopImageStore.deleteImage(doc.imageFileId);
    await collection.updateAsync(doc._id, {
      $unset: { imageFileId: "", imageMimeType: "" },
    });
  }
  return true;
};
