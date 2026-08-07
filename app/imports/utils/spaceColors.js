/**
 * The app's map deep links. The color vocabulary itself lives in
 * common/lib/spaceColors.js, since /api/public publishes the same color names
 * and the rule must not exist twice; it is re-exported here so the app's call
 * sites keep a single import.
 */
export {
  SPACE_COLORS,
  DEFAULT_SPACE_COLOR_NAME,
  spaceColorName,
} from "/imports/common/lib/spaceColors";

// spaceId is only unique per floor (e.g. "kitchen" exists on both), so deep
// links carry the floor to pin the highlight to a single room.
export const spaceMapUrl = (spaceId, colorName, floor) =>
  `/map?space=${encodeURIComponent(spaceId)}` +
  (floor ? `&floor=${encodeURIComponent(floor)}` : "") +
  `&color=${encodeURIComponent(colorName)}`;
