/**
 * URL-safe ids derived from Swedish names, for the public website export.
 *
 * Pure: no Meteor, no database, so the rules can be unit tested directly.
 *
 * Note the deliberate difference from `accentMap` in app/server/methods/utils.js,
 * which *preserves* å, ä and ö because Swish messages allow them. A slug wants
 * the opposite, so this uses Unicode decomposition instead: in NFD, å/ä/ö are
 * a/a/o followed by a combining mark, so stripping the marks transliterates
 * them for free.
 */

// Letters that have no decomposed form and so survive the strip above.
const INDIVISIBLE = { ø: "o", æ: "ae", œ: "oe", ß: "ss", đ: "d", ł: "l", ħ: "h" };

/**
 * "Textilverkstad" -> "textilverkstad", "Trä & Metall" -> "tra-metall".
 *
 * @param {string} text
 * @return {string} may be empty when the input has no usable characters
 */
export const slugify = (text) =>
  String(text || "")
    .toLowerCase()
    // Invisible typographic hints, dropped rather than turned into separators:
    // a soft hyphen only says where a word *may* be broken, so
    // "Bokbindar­verkstaden" is one word and must slug as one.
    .replace(/[\u00ad\u200b-\u200d\ufeff]/g, "")
    .replace(/[øæœßđłħ]/g, (ch) => INDIVISIBLE[ch])
    .normalize("NFD")
    // The combining diacritical marks block, escaped rather than written out:
    // literal combining characters are invisible in an editor and easy to break.
    .replace(/[\u0300-\u036f]/g, "")
    // Anything that is not a latin letter or digit becomes a separator, then
    // runs of separators collapse and the ends are trimmed.
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/**
 * Assign a unique slug to each item, suffixing "-2", "-3" on collision.
 *
 * Two entries can slug to the same string — workshops and groups share one
 * export, so a workshop and a group of the same name collide. The items are
 * ordered by `_id` first, so which one keeps the bare slug does not depend on
 * the order they were read from the database: an hourly caller must get the
 * same ids every time, or the website rebuilds links for nothing.
 *
 * Items whose name yields no usable slug fall back to their `_id`.
 *
 * @param {Array<{_id: string, source: string}>} items  `source` is the text to slug
 * @return {Array<{_id: string, slug: string}>} in the given order, not the sorted one
 */
export const withUniqueSlugs = (items) => {
  const taken = new Map();
  const byId = new Map();
  for (const item of [...items].sort((a, b) => String(a._id).localeCompare(String(b._id)))) {
    const base = slugify(item.source) || String(item._id);
    const seen = taken.get(base) || 0;
    taken.set(base, seen + 1);
    byId.set(item._id, seen === 0 ? base : `${base}-${seen + 1}`);
  }
  return items.map((item) => ({ _id: item._id, slug: byId.get(item._id) }));
};
