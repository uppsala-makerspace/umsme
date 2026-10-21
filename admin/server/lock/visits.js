import { lockApi } from './index';

/** Visits per lock user over the last six months, from the lock's own log. */
export const lockVisits = async (now = new Date()) => {
  const since = new Date(now);
  since.setMonth(since.getMonth() - 6);
  const perPerson = {};
  for (let page = 0; ; page += 1) {
    const openings = await lockApi().log({ page, perPage: 50 });
    for (const o of openings) {
      if (new Date(o.timestamp) >= since) perPerson[o.username] = (perPerson[o.username] || 0) + 1;
    }
    if (!openings.length || new Date(openings[openings.length - 1].timestamp) < since) break;
  }
  return perPerson;
};
