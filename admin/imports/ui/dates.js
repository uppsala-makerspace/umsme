/**
 * Dates as admin writes them, the Swedish way: 2026-10-23, and 2026-10-23
 * 14:05 with the time. Every page shows dates through these, whatever the
 * browser's language.
 */

const pad = (n) => String(n).padStart(2, '0');
const asDate = (value) => (value instanceof Date ? value : new Date(value));

/** The day, YYYY-MM-DD, in local time; '' for none. */
export const day = (value) => {
  if (!value) return '';
  const d = asDate(value);
  return Number.isNaN(d.getTime()) ? '' : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** The day and time, YYYY-MM-DD HH:MM, in local time; '' for none. */
export const dateTime = (value) => {
  if (!value) return '';
  const d = asDate(value);
  return Number.isNaN(d.getTime()) ? '' : `${day(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// Shared with the app's date field.
export { parseDay } from '/imports/common/lib/days';

/**
 * How an end date (when something runs out) stands today: 'past' once the
 * day has gone, 'soon' when it comes within a month, 'later' after that;
 * null for none.
 */
export const expiryTone = (value, now = new Date()) => {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const inAMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const thatDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (thatDay < today) return 'past';
  if (thatDay <= inAMonth) return 'soon';
  return 'later';
};
