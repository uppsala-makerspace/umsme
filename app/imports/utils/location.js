/**
 * Location utilities for proximity-based door unlocking
 */

/**
 * Calculate the distance between two coordinates using the Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in meters
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Format distance for display
 * @param {number} meters - Distance in meters
 * @returns {string} Formatted distance string
 */
export function formatDistance(meters) {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

/**
 * Check if a position is within range of a target location
 * @param {object} userPosition - User's position { lat, long }
 * @param {object} targetLocation - Target location { lat, long }
 * @param {number} range - Maximum distance in meters
 * @returns {boolean} True if within range
 */
export function isWithinRange(userPosition, targetLocation, range) {
  if (!userPosition || !targetLocation) return false;

  const distance = calculateDistance(
    userPosition.lat,
    userPosition.long,
    targetLocation.lat,
    targetLocation.long
  );

  return distance <= range;
}

/**
 * Get distance from user to a target location
 * @param {object} userPosition - User's position { lat, long }
 * @param {object} targetLocation - Target location { lat, long }
 * @returns {number|null} Distance in meters, or null if positions invalid
 */
export function getDistanceTo(userPosition, targetLocation) {
  if (!userPosition || !targetLocation) return null;

  return calculateDistance(
    userPosition.lat,
    userPosition.long,
    targetLocation.lat,
    targetLocation.long
  );
}

/**
 * Why the door view cannot let a member unlock, when the reason is their
 * location. Returns null when location is not what stands in the way — the view
 * uses that to decide whether to offer its troubleshooting guide at all, so a
 * member blocked by an unpaid membership or an unapproved liability keeps seeing
 * exactly what they saw before.
 *
 * "outOfRange" carries the distance to the nearest door with a location, since
 * an indoor GPS fix can be off by hundreds of metres and the number is the
 * whole explanation.
 *
 * @param {object} args
 * @param {Array<{location?: {lat: number, long: number}}>} args.doors
 * @param {object|null} args.userPosition - { lat, long }
 * @param {string} args.locationPermission - pending | granted | denied | unavailable
 * @param {number} args.proximityRange - metres
 * @param {boolean} args.isAdmin
 * @returns {{reason: string, distance: number|null}|null}
 */
export function locationProblemFor({
  doors = [],
  userPosition = null,
  locationPermission = "pending",
  proximityRange = 100,
  isAdmin = false,
}) {
  // Admins unlock regardless of where they are, so location is never their problem.
  if (isAdmin) return null;
  if (locationPermission === "denied") return { reason: "denied", distance: null };
  if (locationPermission === "unavailable") return { reason: "unavailable", distance: null };

  // Doors without a location are openable from anywhere; they cannot be the
  // reason for a complaint about distance.
  const placed = doors.filter((door) => door.location);
  if (placed.length === 0) return null;

  if (!userPosition) return { reason: "noPosition", distance: null };

  const distances = placed
    .map((door) => getDistanceTo(userPosition, door.location))
    .filter((d) => d !== null);
  const anyInRange = placed.some((door) =>
    isWithinRange(userPosition, door.location, proximityRange),
  );
  if (anyInRange) return null;

  return {
    reason: "outOfRange",
    distance: distances.length ? Math.min(...distances) : null,
  };
}
