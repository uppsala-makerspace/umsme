/**
 * Days and times as UMSME writes them, the Swedish way, YYYY-MM-DD and
 * HH:MM, whatever language the page is in: the date and time fields of
 * admin and the app read them with these.
 */

const pad = (n) => String(n).padStart(2, '0');

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

/**
 * A time typed by hand, 18:00, 18.00, 1800 or 18: written HH:MM; '' for
 * nothing; null for something that is no time.
 */
export const parseClock = (text) => {
  const value = (text || '').trim();
  if (!value) return '';
  const m = value.match(/^(\d{1,2})(?:[:.]?(\d{2}))?$/);
  if (!m) return null;
  const [h, min] = [Number(m[1]), Number(m[2] || 0)];
  return h < 24 && min < 60 ? `${pad(h)}:${pad(min)}` : null;
};

/**
 * The association's time zone. The times members see and set (an event at
 * 18:00, check-in closing at 15:00 the day before, the times in a mail) are
 * Swedish times, summer or winter, whatever time zone the server runs in.
 */
export const TIME_ZONE = 'Europe/Stockholm';

const zoneFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE, hourCycle: 'h23',
  year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric',
});

/** A moment's year, month (1–12), day, hour, minute and second in Swedish time. */
export const zonedParts = (date) => {
  return Object.fromEntries(zoneFormat.formatToParts(date)
    .filter((p) => p.type !== 'literal').map((p) => [p.type, Number(p.value)]));
};

// How far Swedish time is ahead of UTC at a moment: one hour in winter, two in summer.
const offsetAt = (ms) => {
  const p = zonedParts(new Date(ms));
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - (ms - (ms % 1000));
};

/**
 * The moment of a Swedish wall time, as `new Date(year, monthIndex, day,
 * hour, minute)` is of a local one: monthIndex from 0, and a day out of range
 * rolls over into the month before or after.
 */
export const zonedDate = (year, monthIndex, day, hour = 0, minute = 0) => {
  const wall = Date.UTC(year, monthIndex, day, hour, minute);
  // Twice, so that a wall time near the change of summer time finds its own offset.
  const first = wall - offsetAt(wall);
  return new Date(wall - offsetAt(first));
};

/**
 * A time of day (HH:MM, midnight when left out), Swedish time, on the day a
 * moment falls on there, or `addDays` days after it (before, when negative).
 */
export const zonedDayAt = (date, addDays = 0, clock = '00:00') => {
  const { year, month, day } = zonedParts(date);
  const [hour, minute] = clock.split(':').map(Number);
  return zonedDate(year, month - 1, day + addDays, hour, minute);
};

/** The day, YYYY-MM-DD, in Swedish time. */
export const zonedDay = (date) => {
  const p = zonedParts(date);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
};

/** HH:MM, in Swedish time. */
export const zonedClock = (date) => {
  const p = zonedParts(date);
  return `${pad(p.hour)}:${pad(p.minute)}`;
};
