import { Meteor } from "meteor/meteor";
import { createImageStore } from "./imageStore";

/**
 * Workshop (verkstad) image storage, configured via
 * `Meteor.settings.private.workshopImages`:
 *
 *   { "localPath": "/srv/umsme/workshop-images" }
 *
 * Defaults to the "local" backend: workshop images are public and few, so
 * they live in a directory on the server rather than on the receipts' Google
 * drive. `localPath` must be an ABSOLUTE path — the directory is shared by
 * the admin app (uploads) and the member app (serving), which run with
 * different working directories. Remember to include it in server backups.
 *
 * The store API is backend-agnostic (fileId is opaque), so this can be
 * switched to the "drive" backend via settings without code changes.
 */

export const workshopImageStore = createImageStore(
  () => ({ backend: "local", ...(Meteor.settings?.private?.workshopImages || {}) }),
  "workshopImages"
);
