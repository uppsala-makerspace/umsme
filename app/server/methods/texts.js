import { Meteor } from "meteor/meteor";
import { loadText, loadJson } from "/imports/common/server/configLoader";
import { Spaces } from "/imports/common/collections/spaces";
import { spaceIconUrlFor } from "/imports/common/server/workshopImage";

const TERMS_DEFAULT_ASSET = {
  termsOfPurchaseMembershipEn: "termsOfPurchaseMembership.en.md",
  termsOfPurchaseMembershipSv: "termsOfPurchaseMembership.sv.md",
};

Meteor.methods({
  /**
   * Get terms of purchase for membership purchases.
   * @param {string} lang - Language code ('en' or 'sv')
   * @returns {string} Markdown content
   */
  async "texts.termsOfPurchaseMembership"(lang = "en") {
    const settingKey = lang === "sv" ? "termsOfPurchaseMembershipSv" : "termsOfPurchaseMembershipEn";
    return await loadText(settingKey, TERMS_DEFAULT_ASSET[settingKey]);
  },

  /**
   * Map data for the app, in the shape the map component expects
   * ({ floor1: { spaceId: {...} }, floor2: {...} }). Built solely from the
   * Spaces collection (managed in admin, seeded via its import) — before the
   * import has run the map simply has no markers.
   */
  async "data.rooms"() {
    const spaces = await Spaces.find({}).fetchAsync();
    const rooms = { floor1: {}, floor2: {} };
    for (const space of spaces) {
      rooms[space.floor] = rooms[space.floor] || {};
      rooms[space.floor][space.spaceId] = {
        name: space.name,
        description: space.description,
        slackChannels: space.slackChannels,
        iconUrl: spaceIconUrlFor(space),
        iconSize: space.iconSize,
      };
    }
    return rooms;
  },

  async "data.slackChannels"() {
    return await loadJson("slackChannelsPath", "slack-channels.json");
  },
});
