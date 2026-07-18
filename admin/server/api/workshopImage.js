import { WebApp } from "meteor/webapp";
import {
  makeWorkshopImageHandler,
  makeGroupImageHandler,
} from "/imports/common/server/workshopImage";

// Serves workshop and group images (public, tokenless — see common/server/
// workshopImage.js). Mounted in both admin and app so either origin can
// render them; the same URLs will later feed the public website.
WebApp.handlers.use("/api/workshops", makeWorkshopImageHandler());
WebApp.handlers.use("/api/groups", makeGroupImageHandler());
