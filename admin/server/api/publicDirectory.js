import { WebApp } from "meteor/webapp";
import { makePublicDirectoryHandler } from "/imports/common/server/publicDirectoryApi";

// The listing the public website builds from (see common/server/
// publicDirectoryApi.js). Its own mount point, so it cannot collide with the
// image handlers on /api/workshops and /api/groups.
//
// World-readable on purpose — unlike /api/certificates, this one must NOT go
// behind the nginx allow/deny block.
WebApp.handlers.use("/api/public", makePublicDirectoryHandler());
