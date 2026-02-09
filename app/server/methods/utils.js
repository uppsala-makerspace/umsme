import { Meteor } from "meteor/meteor";
import fs from "fs";
import path from "path";
import { Members } from "/imports/common/collections/members";
import { memberStatus } from "/imports/common/lib/utils";

// Get the app root directory (where meteor was started from)
const appRoot = process.env.PWD;

// Cache for loaded config files
const configCache = {};

// Default filenames bundled in private/ for each settings key
const defaultAssets = {
  termsOfPurchaseMembershipEn: "termsOfPurchaseMembership.en.md",
  termsOfPurchaseMembershipSv: "termsOfPurchaseMembership.sv.md",
  paymentOptionsPath: "paymentOptions.json",
  notificationsPath: "notifications.json",
  roomsPath: "rooms.json",
  slackChannelsPath: "slack-channels.json",
};

const readConfigFile = async (settingsKey) => {
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

  const assetName = defaultAssets[settingsKey];
  if (assetName) {
    try {
      return await Assets.getTextAsync(assetName);
    } catch (err) {
      console.error(`Failed to load bundled asset ${assetName} for ${settingsKey}:`, err);
      throw new Meteor.Error("config-error", `Failed to load bundled asset: ${assetName}`);
    }
  }

  throw new Meteor.Error("config-error", `Config path not configured: ${settingsKey}`);
};

/**
 * Load a text file from the path specified in settings.
 * Cached after first load.
 * @param {string} settingsKey - The key in settings.private for the file path
 * @returns {Promise<string>} The file contents
 */
export const loadText = async (settingsKey) => {
  if (!configCache[settingsKey]) {
    configCache[settingsKey] = await readConfigFile(settingsKey);
  }
  return configCache[settingsKey];
};

/**
 * Load and parse a JSON file from the path specified in settings.
 * Cached after first load.
 * @param {string} settingsKey - The key in settings.private for the file path
 * @returns {Promise<*>} The parsed JSON content
 */
export const loadJson = async (settingsKey) => {
  if (!configCache[settingsKey]) {
    const text = await readConfigFile(settingsKey);
    try {
      configCache[settingsKey] = JSON.parse(text);
    } catch (err) {
      console.error(`Invalid JSON in config file for ${settingsKey}:`, err);
      throw new Meteor.Error("config-error", `Invalid JSON in config file for ${settingsKey}`);
    }
  }
  return configCache[settingsKey];
};

/**
 * Character mappings for accented characters not in the Swedish alphabet.
 * Swedish å, ä, ö are preserved as they are allowed in Swish messages.
 */
const accentMap = {
  // Lowercase
  'à': 'a', 'á': 'a', 'â': 'a', 'ã': 'a', 'ā': 'a', 'ă': 'a', 'ą': 'a',
  'ç': 'c', 'ć': 'c', 'č': 'c',
  'ď': 'd', 'đ': 'd',
  'è': 'e', 'é': 'e', 'ê': 'e', 'ë': 'e', 'ē': 'e', 'ė': 'e', 'ę': 'e', 'ě': 'e',
  'ğ': 'g', 'ģ': 'g',
  'ì': 'i', 'í': 'i', 'î': 'i', 'ï': 'i', 'ī': 'i', 'į': 'i',
  'ķ': 'k',
  'ļ': 'l', 'ł': 'l',
  'ñ': 'n', 'ń': 'n', 'ņ': 'n', 'ň': 'n',
  'ò': 'o', 'ó': 'o', 'ô': 'o', 'õ': 'o', 'ø': 'o', 'ō': 'o', 'ő': 'o',
  'ŕ': 'r', 'ř': 'r',
  'ś': 's', 'ş': 's', 'š': 's',
  'ţ': 't', 'ť': 't',
  'ù': 'u', 'ú': 'u', 'û': 'u', 'ū': 'u', 'ů': 'u', 'ű': 'u', 'ų': 'u',
  'ý': 'y', 'ÿ': 'y',
  'ź': 'z', 'ż': 'z', 'ž': 'z',
  'æ': 'ae', 'œ': 'oe', 'ß': 'ss',
  // Uppercase
  'À': 'A', 'Á': 'A', 'Â': 'A', 'Ã': 'A', 'Ā': 'A', 'Ă': 'A', 'Ą': 'A',
  'Ç': 'C', 'Ć': 'C', 'Č': 'C',
  'Ď': 'D', 'Đ': 'D',
  'È': 'E', 'É': 'E', 'Ê': 'E', 'Ë': 'E', 'Ē': 'E', 'Ė': 'E', 'Ę': 'E', 'Ě': 'E',
  'Ğ': 'G', 'Ģ': 'G',
  'Ì': 'I', 'Í': 'I', 'Î': 'I', 'Ï': 'I', 'Ī': 'I', 'Į': 'I',
  'Ķ': 'K',
  'Ļ': 'L', 'Ł': 'L',
  'Ñ': 'N', 'Ń': 'N', 'Ņ': 'N', 'Ň': 'N',
  'Ò': 'O', 'Ó': 'O', 'Ô': 'O', 'Õ': 'O', 'Ø': 'O', 'Ō': 'O', 'Ő': 'O',
  'Ŕ': 'R', 'Ř': 'R',
  'Ś': 'S', 'Ş': 'S', 'Š': 'S',
  'Ţ': 'T', 'Ť': 'T',
  'Ù': 'U', 'Ú': 'U', 'Û': 'U', 'Ū': 'U', 'Ů': 'U', 'Ű': 'U', 'Ų': 'U',
  'Ý': 'Y', 'Ÿ': 'Y',
  'Ź': 'Z', 'Ż': 'Z', 'Ž': 'Z',
  'Æ': 'AE', 'Œ': 'OE',
};

/**
 * Sanitize a string for use in Swish payment messages.
 *
 * Swish allows: letters a-ö, A-Ö, numbers 0-9, and special characters :;.,?!()"-
 * This function:
 * 1. Replaces accented characters (except Swedish å, ä, ö) with their base forms
 * 2. Removes any remaining disallowed characters
 *
 * @param {string} str - The string to sanitize
 * @returns {string} - The sanitized string safe for Swish messages
 */
export const sanitizeForSwish = (str) => {
  if (!str) return '';

  // Replace known accented characters with their base forms
  let result = '';
  for (const char of str) {
    if (accentMap[char]) {
      result += accentMap[char];
    } else {
      result += char;
    }
  }

  // Remove any characters not allowed by Swish
  // Allowed: a-z, A-Z, å, ä, ö, Å, Ä, Ö, 0-9, space, :;.,?!()"-
  result = result.replace(/[^a-zA-ZåäöÅÄÖ0-9 :;.,?!()"-]/g, '');

  return result;
};

/**
 * Gets the lab end date for a member, handling family memberships.
 * @param {object} member - The member object
 * @returns {Promise<Date|null>} The lab end date or null if not found
 */
export const getLabEndForMember = async (member) => {
  if (!member) return null;

  // Get the paying member for family memberships
  const paying = member.infamily
    ? await Members.findOneAsync(member.infamily)
    : member;

  const status = await memberStatus(paying);
  return status.labEnd || null;
};

/**
 * Checks if the member has an active lab membership.
 * @param {object} member - The member object
 * @returns {Promise<boolean>}
 */
export const hasActiveLabMembership = async (member) => {
  const labEnd = await getLabEndForMember(member);
  return labEnd !== null && labEnd > new Date();
};

export const findForUser = async () => {
  let user;
  let email;
  let verified;
  let member;
  if (Meteor.userId()) {
    user = await Meteor.userAsync();
    const firstEmail = user?.emails?.[0];
    const firstService = user?.service?.[0];
    if (firstEmail) {
      email = firstEmail?.address;
      verified = firstEmail.verified;
      if (verified) {
        member = await Members.findOneAsync({email});
      }
    } else if (firstService) {
      email = firstService.email;
      verified = true;
    }
  }
  return {user, email, verified, member};
};

export const findMemberForUser = async () => {
  const { member } = await findForUser();
  return member;
};
