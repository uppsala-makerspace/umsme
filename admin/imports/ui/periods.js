/**
 * Periods as admin's charts write them: months, quarters, years and days of a
 * month, from the keys the server uses ("2026-10", "2026-Q4", "2026",
 * "2026-10-07"). Shared by the member's Activity tab and the door visits, so
 * both write periods alike. Nothing from Meteor, so Storybook can use it.
 */

const monthDate = (key) => {
  const [year, month] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, 15));
};

/** "Nov", with the year on the first bar and on January: "Dec 2025", "Jan 2026". */
export const monthLabel = (key, index) => {
  const month = Number(key.slice(5, 7));
  const name = monthDate(key).toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' });
  return index === 0 || month === 1 ? `${name} ${key.slice(0, 4)}` : name;
};

/** "November 2026". */
export const monthName = (key) =>
  monthDate(key).toLocaleString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });

/** "Q3", with the year on the first bar and on Q1: "2026 Q2". Key "2026-Q3". */
export const quarterLabel = (key, index) => {
  const [year, quarter] = key.split('-');
  return index === 0 || quarter === 'Q1' ? `${year} ${quarter}` : quarter;
};

/** "Q3 2026". */
export const quarterName = (key) => key.split('-').reverse().join(' ');

/** "7" for "2026-10-07". */
export const dayLabel = (key) => String(Number(key.slice(8, 10)));

/** "7 October 2026". */
export const dayName = (key) => `${dayLabel(key)} ${monthName(key.slice(0, 7))}`;

/** The days of a month, "2026-02-01" …, with what `days` has for each, else 0. */
export const daysOf = (monthKey, days) => {
  const [year, month] = monthKey.split('-').map(Number);
  const count = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const known = Object.fromEntries(days.filter((d) => d.day.startsWith(`${monthKey}-`)).map((d) => [d.day, d]));
  return Array.from({ length: count }, (_, i) => {
    const day = `${monthKey}-${String(i + 1).padStart(2, '0')}`;
    return { day, label: String(i + 1), openings: known[day]?.openings || 0, visits: known[day]?.visits || 0 };
  });
};
