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

/**
 * A day typed by hand as YYYY-MM-DD (or YYYYMMDD), if it is one: the day,
 * written YYYY-MM-DD; '' for nothing; null for something that is no day.
 */
export const parseDay = (text) => {
  const value = (text || '').trim();
  if (!value) return '';
  const m = value.match(/^(\d{4})-?(\d{2})-?(\d{2})$/);
  if (!m) return null;
  const [y, mo, d] = m.slice(1).map(Number);
  const date = new Date(y, mo - 1, d);
  return date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d ? `${m[1]}-${m[2]}-${m[3]}` : null;
};
