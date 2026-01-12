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
