/**
 * Dates relative to today, so that seeded memberships stay active (or stay
 * expired) whenever the scenario is run.
 */
export const DAY_MS = 24 * 60 * 60 * 1000;

export const daysFromNow = (days, now = new Date()) => new Date(now.getTime() + days * DAY_MS);

export const monthsFromNow = (months, now = new Date()) => {
  const date = new Date(now);
  date.setMonth(date.getMonth() + months);
  return date;
};
