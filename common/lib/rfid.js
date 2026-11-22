/**
 * A member's RFID tag, as it is typed, stored and exported: the bytes in hex,
 * upper case, a dash between each, e.g. 03-D7-3B-99. Whatever else is typed
 * or pasted (colons, spaces, dashes) is dropped. No Meteor, so the forms and
 * Storybook can use it.
 */

/** A whole tag: one byte or more. */
export const RFID_PATTERN = /^[0-9A-F]{2}(-[0-9A-F]{2})*$/;

/** Room for ten bytes, the longest common tag id. */
export const RFID_MAX = 29;

/**
 * The tag as it should read, also while it is typed: an odd last digit stays,
 * so "03d73" gives "03-D7-3".
 *
 * @param {string} input
 * @returns {string}
 */
export const formatRfid = (input) =>
  (String(input ?? "").replace(/[^0-9a-fA-F]/g, "").toUpperCase().match(/.{1,2}/g) || []).join("-");

/**
 * The tag to store, or null when none is given. It may still fail
 * RFID_PATTERN (an odd number of digits), which the caller checks.
 *
 * @param {string|null|undefined} input
 * @returns {string|null}
 */
export const normalizeRfid = (input) => formatRfid(input) || null;
