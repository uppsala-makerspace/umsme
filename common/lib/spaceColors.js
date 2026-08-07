/**
 * The well-defined space colors, shared by the app's map and the public
 * website export.
 *
 * In the app the color travels in the URL by NAME (?space=X&color=purple) and
 * is resolved against this whitelist, so arbitrary values can never reach the
 * SVG styles. The primary space is always green; secondaries cycle through the
 * other four.
 *
 * Lives in common/ rather than the app because /api/public (served from admin)
 * publishes the color name per space, and the rule must not exist twice.
 * The app's URL builder for the map page stays in app/imports/utils/spaceColors.js.
 */
export const SPACE_COLORS = {
  green: "#5fc86f",
  blue: "#5fa8c8",
  amber: "#e0b64f",
  purple: "#b18fd0",
  coral: "#e08a6f",
};

export const DEFAULT_SPACE_COLOR_NAME = "green";

const SECONDARY_COLOR_NAMES = ["blue", "amber", "purple", "coral"];

export const spaceColorName = (index) =>
  index === 0
    ? DEFAULT_SPACE_COLOR_NAME
    : SECONDARY_COLOR_NAMES[(index - 1) % SECONDARY_COLOR_NAMES.length];
