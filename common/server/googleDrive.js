import { Meteor } from "meteor/meteor";
import { createImageStore } from "./imageStore";

/**
 * Receipt image storage, configured via `Meteor.settings.private.googleDrive`
 * (see common/server/imageStore.js for the config shape and backends).
 *
 * Receipts live on a Google shared drive in production because they need
 * off-server durability and access control; the "local" backend exists for
 * dev/testing. `fileId` is the opaque handle stored on the expense.
 */

const store = createImageStore(
  () => Meteor.settings?.private?.googleDrive,
  "googleDrive"
);

export const uploadImage = store.uploadImage;
export const downloadImage = store.downloadImage;
export const deleteImage = store.deleteImage;
