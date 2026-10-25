import { WebApp } from "meteor/webapp";
import {
  makeWorkshopImageHandler,
  makeGroupImageHandler,
  makeSpaceIconHandler,
  makeStoreItemImageHandler,
  makeActivityImageHandler,
  makeEventImageHandler,
} from "/imports/common/server/workshopImage";

// Serves workshop and group images (public, tokenless — see common/server/
// workshopImage.js). Mounted in both admin and app; the same URLs will later
// feed the public website.
WebApp.handlers.use("/api/workshops", makeWorkshopImageHandler());
WebApp.handlers.use("/api/groups", makeGroupImageHandler());
WebApp.handlers.use("/api/spaces", makeSpaceIconHandler());
WebApp.handlers.use("/api/store-items", makeStoreItemImageHandler());
WebApp.handlers.use("/api/activities", makeActivityImageHandler());
WebApp.handlers.use("/api/events", makeEventImageHandler());
