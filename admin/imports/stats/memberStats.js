import { buildSeries, sortAndAccumulate } from './membershipSeries';
import { statsPerMonth } from './joiningStats';
import { yearlyChurn } from '/imports/stats/churn';

/**
 * The membership statistics and the member history, worked out on the
 * server from every membership and member, so the pages get the figures
 * rather than the collections.
 */

/** Where a period starts: everything, or the last year, quarter or month. */
export const periodStart = (interval, now = new Date()) => {
  const start = new Date(now);
  if (interval === 'year') start.setFullYear(now.getFullYear() - 1);
  else if (interval === 'quarter') start.setMonth(now.getMonth() - 3);
  else if (interval === 'month') start.setMonth(now.getMonth() - 1);
  else return null;
  return start;
};

const last = (series) => (series.length ? series[series.length - 1].y : null);

/**
 * The member counts over time by kind, and per month what joined, renewed,
 * paused, came back and left, time to renew and years active, and the
 * churn over the last year month by month (yearlyChurn).
 */
export const membershipStatistics = (memberships, interval = 'all', now = new Date()) => {
  const from = periodStart(interval, now);
  const { memberEvents, individualEvents, individualLabEvents, familyEvents, familyLabEvents } = buildSeries(memberships);
  const series = {
    members: sortAndAccumulate(memberEvents, from, now),
    individual: sortAndAccumulate(individualEvents, from, now),
    individualLab: sortAndAccumulate(individualLabEvents, from, now),
    family: sortAndAccumulate(familyEvents, from, now),
    familyLab: sortAndAccumulate(familyLabEvents, from, now),
  };
  const counts = Object.fromEntries(Object.entries(series).map(([kind, s]) => [kind, last(s)]));
  const { index, ...monthly } = statsPerMonth(memberships, from, now);
  return { counts, series, monthly, churn: yearlyChurn(memberships, from, now) };
};

/**
 * Who has been a member, for how long, and whether they still are; family
 * members are left out, their payer counts. With the current counts by kind.
 */
export const memberHistory = (memberships, members, now = new Date()) => {
  const { index } = statsPerMonth(memberships, null, now);
  const stats = { historic: 0, active: 0, infamily: 0, paying: 0, member: 0, family: 0, lab: 0, labfamily: 0 };
  const byId = {};
  for (const m of members) {
    byId[m._id] = m;
    if (!(m.member > now)) {
      stats.historic += 1;
    } else {
      stats.active += 1;
      const lab = m.lab && m.lab > now;
      if (m.infamily) stats.infamily += 1;
      else {
        stats.paying += 1;
        if (m.family) stats[lab ? 'labfamily' : 'family'] += 1;
        else stats[lab ? 'lab' : 'member'] += 1;
      }
    }
  }
  const rows = [];
  for (const [memberId, obj] of Object.entries(index)) {
    const member = byId[memberId];
    if (!obj.joined || !member?.member || member.infamily) continue;
    rows.push({
      _id: memberId,
      name: member.name,
      email: member.email,
      family: !!member.family,
      years: obj.years,
      days: Math.floor((now - obj.joined) / 1000 / 3600 / 24),
      left: obj.left || null,
      lab: member.lab === undefined ? null : (member.lab > now ? 'current' : 'expired'),
      active: member.member > now,
    });
  }
  rows.sort((a, b) => b.days - a.days);
  return { stats, rows };
};
