import { groupByMember } from '/imports/stats/membershipSeries';

/**
 * A member who renews within this long after a month's end is not counted
 * as lost that month: renewing a few weeks late is not leaving. So the last
 * months, whose late renewals are not yet known, are left out.
 */
export const CHURN_GRACE_MONTHS = 3;

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * Churn over the last year, month by month: of the paying members (a
 * family counts once, through its payer) who held a membership at the end
 * of the month a year earlier, the share who have not renewed: who hold
 * none at the month's end, nor at any time in the CHURN_GRACE_MONTHS after
 * it (a renewal a few weeks late is not a loss). Memberships are the base
 * ones, member or labandmember, as the member counts are.
 *
 * The first month is the first a year after the earliest membership, the
 * last the one that ended CHURN_GRACE_MONTHS ago, so that every late
 * renewal is known; with `from`, none ending before it.
 *
 * @param {Array<object>} memberships every Membership document
 * @param {Date|null} from
 * @param {Date} now
 * @returns {{ labels: string[], percent: number[], lost: number[], base: number[], year: (number|null)[] }}
 *   `year` is set on the months whose year is a calendar year (the
 *   Decembers: measured at the turn of the year), null on the others.
 */
export const yearlyChurn = (memberships, from, now = new Date()) => {
  const periods = Object.values(groupByMember(memberships))
    .map((obj) => obj.memberships
      .filter((ms) => (ms.type === 'member' || ms.type === 'labandmember') && ms.start && ms.memberend)
      .map((ms) => [new Date(ms.start), new Date(ms.memberend)]))
    .filter((p) => p.length);
  const result = { labels: [], percent: [], lost: [], base: [], year: [] };
  const earliest = periods.reduce((min, p) => p.reduce((m, [start]) => (start < m ? start : m), min), now);
  const holds = (p, when) => p.some(([start, end]) => start <= when && end >= when);
  const heldWithin = (p, after, until) => p.some(([start, end]) => start <= until && end >= after);
  for (let month = new Date(earliest.getFullYear() + 1, earliest.getMonth(), 1); ; month = new Date(month.getFullYear(), month.getMonth() + 1, 1)) {
    const end = new Date(month.getFullYear(), month.getMonth() + 1, 1);
    const graceUntil = new Date(end.getFullYear(), end.getMonth() + CHURN_GRACE_MONTHS, 1);
    if (graceUntil > now) break;
    if (from && end <= from) continue;
    const yearAgo = new Date(end.getFullYear() - 1, end.getMonth(), 1);
    const base = periods.filter((p) => holds(p, yearAgo));
    const lost = base.filter((p) => !heldWithin(p, end, graceUntil)).length;
    result.labels.push(`${month.getFullYear()} - ${MONTHS[month.getMonth()]}`);
    result.year.push(month.getMonth() === 11 ? month.getFullYear() : null);
    result.base.push(base.length);
    result.lost.push(lost);
    result.percent.push(base.length ? Math.round((1000 * lost) / base.length) / 10 : 0);
  }
  return result;
};
