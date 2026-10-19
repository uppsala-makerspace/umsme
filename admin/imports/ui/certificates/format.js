/** A date as the day it falls on here, YYYY-MM-DD; '' for none. */
export const day = (date) => (date ? new Date(date).toLocaleDateString('sv-SE') : '');

/** Today, as a date field wants it. */
export const today = () => day(new Date());

/** The day `days` after `from` (a YYYY-MM-DD), as a date field wants it. */
export const daysAfter = (from, days) => {
  const date = new Date(`${from}T00:00:00`);
  date.setDate(date.getDate() + days);
  return day(date);
};
