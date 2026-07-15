import { WebApp } from "meteor/webapp";
import { makeWorkshopImageHandler } from "/imports/common/server/workshopImage";

// Serves workshop images (public, tokenless — see common/server/
// workshopImage.js). Mounted in both admin and app so either origin can
// render them; the same URL will later feed the public website.
WebApp.handlers.use("/api/workshops", makeWorkshopImageHandler());
