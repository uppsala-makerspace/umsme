import { Meteor } from "meteor/meteor";
import fs from "fs";
import path from "path";

// Resolve override paths relative to the app's working directory.
const appRoot = process.env.PWD;

// In-memory cache; first successful load is kept for the lifetime of the process.
const configCache = {};

/**
 * Read a config file's text. If `Meteor.settings.private[settingsKey]` is set,
 * the path is resolved relative to the app's PWD. Otherwise, falls back to a
 * file bundled in the app's `private/` directory via Meteor Assets.
 *
 * @param {string} settingsKey - The settings key under `Meteor.settings.private` to honour for an override path.
 * @param {string} defaultAssetName - The bundled asset filename to use when no override is set.
 * @returns {Promise<string>} The file contents.
 */
const readConfigFile = async (settingsKey, defaultAssetName) => {
  const configPath = Meteor.settings?.private?.[settingsKey];
  if (configPath) {
    try {
      const fullPath = path.resolve(appRoot, configPath);
      return fs.readFileSync(fullPath, "utf8");
    } catch (err) {
      console.error(`Failed to load config file for ${settingsKey}:`, err);
      throw new Meteor.Error("config-error", "Failed to load config file");
    }
  }

  if (defaultAssetName) {
    try {
      return await Assets.getTextAsync(defaultAssetName);
    } catch (err) {
      console.error(`Failed to load bundled asset ${defaultAssetName} for ${settingsKey}:`, err);
      throw new Meteor.Error("config-error", `Failed to load bundled asset: ${defaultAssetName}`);
    }
  }

  throw new Meteor.Error("config-error", `Config path not configured: ${settingsKey}`);
};

/**
 * Load a text file, cached after first read.
 *
 * @param {string} settingsKey - The key in `Meteor.settings.private` for the override path.
 * @param {string} defaultAssetName - The bundled asset filename to use when no override is set.
 * @returns {Promise<string>} The file contents.
 */
export const loadText = async (settingsKey, defaultAssetName) => {
  if (!configCache[settingsKey]) {
    configCache[settingsKey] = await readConfigFile(settingsKey, defaultAssetName);
  }
  return configCache[settingsKey];
};

/**
 * Load and parse a JSON file, cached after first read.
 *
 * @param {string} settingsKey - The key in `Meteor.settings.private` for the override path.
 * @param {string} defaultAssetName - The bundled asset filename to use when no override is set.
 * @returns {Promise<*>} The parsed JSON content.
 */
export const loadJson = async (settingsKey, defaultAssetName) => {
  if (!configCache[settingsKey]) {
    const text = await readConfigFile(settingsKey, defaultAssetName);
    try {
      configCache[settingsKey] = JSON.parse(text);
    } catch (err) {
      console.error(`Invalid JSON in config file for ${settingsKey}:`, err);
      throw new Meteor.Error("config-error", `Invalid JSON in config file for ${settingsKey}`);
    }
  }
  return configCache[settingsKey];
};
