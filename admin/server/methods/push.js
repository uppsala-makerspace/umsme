import { Meteor } from "meteor/meteor";
import { initPush } from "/imports/common/server/push";

// Push goes out from the domain functions (messages, announcements); no client calls it directly.
Meteor.startup(() => {
  initPush();
});
