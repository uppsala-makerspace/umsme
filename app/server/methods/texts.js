import { Meteor } from "meteor/meteor";
import { loadText, loadJson } from "/imports/common/server/configLoader";

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

  async "data.rooms"() {
    return await loadJson("roomsPath", "rooms.json");
  },

  async "data.slackChannels"() {
    return await loadJson("slackChannelsPath", "slack-channels.json");
  },
});
