import { Meteor } from "meteor/meteor";
import fs from "fs";
import path from "path";

// Get the app root directory (where meteor was started from)
const appRoot = process.env.PWD;

// Cache for loaded texts
const textCache = {};

/**
 * Load a text file from the path specified in settings.
 * @param {string} settingKey - The key in settings.private for the file path
 * @returns {string} The file contents
 */
const loadText = (settingKey) => {
  if (!textCache[settingKey]) {
    const configPath = Meteor.settings?.private?.[settingKey];
    if (!configPath) {
      throw new Meteor.Error("config-error", `Text path not configured: ${settingKey}`);
    }
    try {
      const fullPath = path.resolve(appRoot, configPath);
      textCache[settingKey] = fs.readFileSync(fullPath, "utf8");
    } catch (err) {
      console.error(`Failed to load text file for ${settingKey}:`, err);
      throw new Meteor.Error("config-error", "Failed to load text file");
    }
  }
  return textCache[settingKey];
};

Meteor.methods({
  /**
   * Get terms of purchase for membership purchases.
   * @param {string} lang - Language code ('en' or 'sv')
   * @returns {string} Markdown content
   */
  "texts.termsOfPurchaseMembership"(lang = "en") {
    const settingKey = lang === "sv" ? "termsOfPurchaseMembershipSv" : "termsOfPurchaseMembershipEn";
    return loadText(settingKey);
  },
});
