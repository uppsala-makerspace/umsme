/**
 * Days as UMSME writes them, the Swedish way, YYYY-MM-DD, whatever language
 * the page is in: the date fields of admin and the app read them with this.
 */

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
