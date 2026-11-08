import { DoorUnlocks } from '/imports/common/collections/doorunlocks';
import { ACTIVITY_TIME_ZONE, monthKey } from '/imports/common/server/doors/doorUnlocks';

/**
 * Door visits for the door statistics in admin. A visit is a day (Swedish
 * time) a member opened any door: at most one a day per member. Openings
 * without a member (a lock user the sync could not tie to anyone) do not
 * count.
 *
 * Computed on every call: a year of openings is a few thousand member-days,
 * counted in milliseconds. Should it ever be slow, a cache around
 * doorVisitStats changes nothing else.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
export const VISIT_VIEWS = ['day', 'month', 'quarter', 'year'];

const pad = (n) => String(n).padStart(2, '0');

/** "YYYY-MM-DD" of a date in Swedish time. */
export const dayKey = (date) => {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: ACTIVITY_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
};

const lastDayOfMonth = (month) => {
  const [y, m] = month.split('-').map(Number);
  return `${month}-${pad(new Date(Date.UTC(y, m, 0)).getUTCDate())}`;
};

/** The months from `first` to `last` ("YYYY-MM"), oldest first. */
const monthsBetween = (first, last) => {
  const [fy, fm] = first.split('-').map(Number);
  const [ly, lm] = last.split('-').map(Number);
  const keys = [];
  for (let i = fy * 12 + fm - 1; i <= ly * 12 + lm - 1; i += 1) keys.push(`${Math.floor(i / 12)}-${pad((i % 12) + 1)}`);
  return keys;
};

const quarterOf = (day) => `${day.slice(0, 4)}-Q${Math.ceil(Number(day.slice(5, 7)) / 3)}`;

/** The quarters from the one `firstDay` is in to the one `lastDay` is in, oldest first. */
const quartersBetween = (firstDay, lastDay) => {
  const toIndex = (q) => Number(q.slice(0, 4)) * 4 + Number(q.slice(6)) - 1;
  const keys = [];
  for (let i = toIndex(quarterOf(firstDay)); i <= toIndex(quarterOf(lastDay)); i += 1) keys.push(`${Math.floor(i / 4)}-Q${(i % 4) + 1}`);
  return keys;
};

const daysBetween = (fromDay, toDay) => {
  const keys = [];
  for (let d = fromDay; d <= toDay;) {
    keys.push(d);
    const [y, m, dd] = d.split('-').map(Number);
    const next = new Date(Date.UTC(y, m - 1, dd + 1));
    d = `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
  }
  return keys;
};

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** 0 for Monday … 6 for Sunday, of a "YYYY-MM-DD". */
const weekdayOf = (day) => {
  const [y, m, d] = day.split('-').map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
};

/**
 * The average visits per weekday over the days from `fromDay` to `toDay`,
 * days without a visit included: [{ weekday: 'Mon', days, visits, average }],
 * Monday first. A member gives at most one visit a day, so this is also the
 * average of members per weekday.
 */
export const weekdayAverages = (fromDay, toDay, visitsOnDay) => {
  const rows = WEEKDAYS.map((weekday) => ({ weekday, days: 0, visits: 0 }));
  for (const day of daysBetween(fromDay, toDay)) {
    const row = rows[weekdayOf(day)];
    row.days += 1;
    row.visits += visitsOnDay[day] || 0;
  }
  return rows.map((row) => ({ ...row, average: row.days ? row.visits / row.days : 0 }));
};

/**
 * Door openings per hour of the day (Swedish time) from `fromDay` to `toDay`:
 * [{ hour: 0…23, openings, average }], `average` per day over those days.
 * Every opening counts, also a lock user's not tied to a member: this is the
 * activity in the space, not the members' visits.
 */
export const hourlyOpenings = async (fromDay, toDay) => {
  const days = fromDay <= toDay ? daysBetween(fromDay, toDay).length : 0;
  const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, openings: 0, average: 0 }));
  if (!days) return hours;
  const utc = (day) => { const [y, m, d] = day.split('-').map(Number); return Date.UTC(y, m - 1, d); };
  const groups = await DoorUnlocks.rawCollection().aggregate([
    { $match: { timestamp: { $gte: new Date(utc(fromDay) - 2 * DAY_MS), $lt: new Date(utc(toDay) + 3 * DAY_MS) } } },
    { $group: {
      _id: {
        day: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp', timezone: ACTIVITY_TIME_ZONE } },
        hour: { $hour: { date: '$timestamp', timezone: ACTIVITY_TIME_ZONE } },
      },
      count: { $sum: 1 },
    } },
  ]).toArray();
  for (const { _id: { day, hour }, count } of groups) {
    if (day >= fromDay && day <= toDay) hours[hour].openings += count;
  }
  return hours.map((h) => ({ ...h, average: h.openings / days }));
};

/**
 * The member-days with an opening between two days (Swedish time), both
 * included: [{ day: '2026-10-01', memberid }].
 */
export const memberDays = async ({ fromDay, toDay }) => {
  if (fromDay > toDay) return [];
  const utc = (day) => { const [y, m, d] = day.split('-').map(Number); return Date.UTC(y, m - 1, d); };
  // Two days of margin each way for the time zone; the day keys decide.
  const groups = await DoorUnlocks.rawCollection().aggregate([
    { $match: {
      memberid: { $exists: true, $ne: null },
      timestamp: { $gte: new Date(utc(fromDay) - 2 * DAY_MS), $lt: new Date(utc(toDay) + 3 * DAY_MS) },
    } },
    { $group: {
      _id: {
        day: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp', timezone: ACTIVITY_TIME_ZONE } },
        memberid: '$memberid',
      },
    } },
  ]).toArray();
  return groups
    .map(({ _id }) => _id)
    .filter(({ day }) => day >= fromDay && day <= toDay);
};

/**
 * Visits for the door statistics: per day of a month, or per month of a year,
 * per quarter or per year since the first opening. Each bar has its visits
 * (member-days) and its unique members (each member once per bar); `total`
 * the same over everything shown. Nothing after today.
 *
 * @param {{ view: 'day'|'month'|'quarter'|'year', month?: string, year?: number, now?: Date }} options
 *   `month` ("YYYY-MM") for the day view, `year` for the month view; the
 *   current one when left out.
 * Per day and per month also the average visits per weekday, and the
 * average door openings per hour of the day, over the days shown (the
 * month's, or the year's, up to today).
 *
 * The average per bar is over the bars shown, except an unfinished month,
 * quarter or year (the one today is in), which would pull it down; per day it
 * is over the days up to today. With only the unfinished bar, it is that bar.
 *
 * @returns {Promise<{ view: string, month?: string, year?: number,
 *   bars: { key: string, visits: number, unique: number }[],
 *   total: { visits: number, unique: number },
 *   average: { visits: number, unique: number, over: number },
 *   weekdays?: { weekday: string, days: number, visits: number, average: number }[],
 *   hours?: { hour: number, openings: number, average: number }[],
 *   available: { months: string[], years: number[] } }>}  `available`: what
 *   can be chosen, from the first opening to now, newest first
 */
export const doorVisitStats = async ({ view, month, year, now = new Date() }) => {
  const today = dayKey(now);
  const first = await DoorUnlocks.findOneAsync(
    { memberid: { $exists: true, $ne: null } },
    { sort: { timestamp: 1 }, fields: { timestamp: 1 } },
  );
  const firstDay = first ? dayKey(first.timestamp) : today;
  const thisMonth = monthKey(now);

  let keys;
  let fromDay;
  let toDay = today;
  let barOf;
  const result = { view };
  if (view === 'day') {
    const shown = month || thisMonth;
    result.month = shown;
    fromDay = `${shown}-01`;
    toDay = [lastDayOfMonth(shown), today].sort()[0];
    keys = daysBetween(fromDay, toDay);
    barOf = (day) => day;
  } else if (view === 'month') {
    const shown = year || Number(today.slice(0, 4));
    result.year = shown;
    fromDay = `${shown}-01-01`;
    toDay = [`${shown}-12-31`, today].sort()[0];
    keys = fromDay <= toDay ? monthsBetween(`${shown}-01`, toDay.slice(0, 7)) : [];
    barOf = (day) => day.slice(0, 7);
  } else if (view === 'quarter') {
    fromDay = `${quarterOf(firstDay).slice(0, 4)}-${pad((Number(quarterOf(firstDay).slice(6)) - 1) * 3 + 1)}-01`;
    keys = quartersBetween(firstDay, today);
    barOf = quarterOf;
  } else {
    fromDay = `${firstDay.slice(0, 4)}-01-01`;
    keys = [];
    for (let y = Number(firstDay.slice(0, 4)); y <= Number(today.slice(0, 4)); y += 1) keys.push(String(y));
    barOf = (day) => day.slice(0, 4);
  }

  const bars = Object.fromEntries(keys.map((key) => [key, { visits: 0, members: new Set() }]));
  const everyone = new Set();
  let visits = 0;
  const visitsOnDay = {};
  for (const { day, memberid } of await memberDays({ fromDay, toDay })) {
    visitsOnDay[day] = (visitsOnDay[day] || 0) + 1;
    const bar = bars[barOf(day)];
    if (!bar) continue;
    bar.visits += 1;
    bar.members.add(memberid);
    visits += 1;
    everyone.add(memberid);
  }

  const shown = keys.map((key) => ({ key, visits: bars[key].visits, unique: bars[key].members.size }));
  const unfinished = view === 'day' ? null : barOf(today);
  const complete = shown.filter((bar) => bar.key !== unfinished);
  const averaged = complete.length ? complete : shown;
  const mean = (field) => (averaged.length ? averaged.reduce((sum, bar) => sum + bar[field], 0) / averaged.length : 0);

  const months = monthsBetween(firstDay.slice(0, 7), thisMonth).reverse();
  return {
    ...result,
    bars: shown,
    total: { visits, unique: everyone.size },
    average: { visits: mean('visits'), unique: mean('unique'), over: averaged.length },
    ...(view === 'day' || view === 'month' ? {
      weekdays: weekdayAverages(fromDay, toDay, visitsOnDay),
      hours: await hourlyOpenings(fromDay, toDay),
    } : {}),
    available: { months, years: [...new Set(months.map((m) => Number(m.slice(0, 4))))] },
  };
};
