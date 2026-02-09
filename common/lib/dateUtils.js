const msPerDay = 1000 * 60 * 60 * 24;

const toNoon = (date) => {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  return d;
};

/**
 * Calculate the number of whole calendar days between two dates.
 * Positive when d2 is after d1.
 * Both dates are normalized to noon to avoid DST and time-of-day issues.
 */
export const daysBetween = (d1, d2) => {
  return Math.round((toNoon(d2) - toNoon(d1)) / msPerDay);
};
