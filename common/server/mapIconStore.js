import { Meteor } from "meteor/meteor";
import { createImageStore } from "./imageStore";

/**
 * Map icon storage for spaces (ytor), configured via
 * `Meteor.settings.private.mapIcons`:
 *
 *   { "localPath": "/srv/umsme/map-icons" }
 *
 * Defaults to the "local" backend. `localPath` must be an ABSOLUTE path —
 * the directory is shared by the admin app (uploads) and the member app
 * (serving the map), which run with different working directories. Remember
 * to include it in server backups.
 */
export const mapIconStore = createImageStore(
  () => ({ backend: "local", ...(Meteor.settings?.private?.mapIcons || {}) }),
  "mapIcons"
);
