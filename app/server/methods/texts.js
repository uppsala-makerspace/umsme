import { Meteor } from "meteor/meteor";
import { loadText, loadJson } from "/server/methods/utils";

Meteor.methods({
  /**
   * Get terms of purchase for membership purchases.
   * @param {string} lang - Language code ('en' or 'sv')
   * @returns {string} Markdown content
   */
  async "texts.termsOfPurchaseMembership"(lang = "en") {
    const settingKey = lang === "sv" ? "termsOfPurchaseMembershipSv" : "termsOfPurchaseMembershipEn";
    return await loadText(settingKey);
  },

  async "data.rooms"() {
    return await loadJson("roomsPath");
  },

  async "data.slackChannels"() {
    return await loadJson("slackChannelsPath");
  },
});
