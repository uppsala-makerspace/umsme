/**
 * Turns Membership documents into the +1/-1 event series the statistics and
 * history graphs accumulate.
 *
 * Pure: takes plain arrays of membership objects, no Meteor collections, so it
 * can be unit tested without a database (see admin/tests/stats.tests.js).
 *
 * The naive approach — +1 at every `start`, -1 at every `memberend` — counts a
 * member twice whenever two of their memberships overlap. That happens on every
 * upgrade, where the new membership starts today while the one it replaces runs
 * for months yet. Instead we build, per member, a timeline of which membership is
 * *effective* at each point, so a member contributes at most 1 at any time and
 * lands in exactly one category.
 *
 * Cross-check: today's counts should equal what the history page derives straight
 * from the denormalized `Members.member`/`Members.lab` fields
 * (paying/member/lab/family/labfamily).
 *
 * Known exception: a member who has joined someone's family (`Members.infamily`
 * set) while an own, still-running membership document remains is counted here
 * but not by the history page, which treats `infamily` as "not paying". We
 * deliberately do not filter on `infamily`: it is a present-day flag with no
 * history, so filtering would erase that person's genuinely individual
 * membership from earlier years in the graphs. Expect the current total to sit a
 * hair above the history page when such records exist — see
 * docs/business-rules.md section 14.
 */

// Only these types establish membership presence. A standalone quarterly lab
// document ('lab') grants lab access but never membership on its own.
const MEMBER_TYPES = new Set(['member', 'labandmember']);

/**
 * Group memberships per member, each member's list sorted by start date.
 * Shape is `{ [mid]: { memberships: [...] } }` — statsPerMonth enriches those
 * objects further (see ui/stats/utils.js).
 *
 * @param {Array<object>} memberships
 * @return {Object<string, {memberships: Array<object>}>}
 */
export const groupByMember = (memberships) => {
  const index = {};
  memberships.forEach((ms) => {
    let obj = index[ms.mid];
    if (!obj) {
      obj = { memberships: [] };
      index[ms.mid] = obj;
    }
    obj.memberships.push(ms);
  });
  Object.values(index).forEach((obj) =>
    obj.memberships.sort((a, b) => (a.start < b.start ? -1 : 1)));
  return index;
};

/**
 * Which category one member falls into at a given time, or null when they are
 * not a paying member then.
 *
 * - presence comes from any member/labandmember covering `when` (the union of
 *   intervals, so overlaps can't double count)
 * - lab comes from any membership whose lab span covers `when`, including a
 *   quarterly lab document — mirroring how the history page reads `member.lab`
 * - family comes from the *latest started* membership covering `when`, since an
 *   upgrade supersedes the membership it replaces
 *
 * @param {Array<object>} memberships  One member's memberships
 * @param {Date} when
 * @return {'individual'|'individualLab'|'family'|'familyLab'|null}
 */
export const categoryAt = (memberships, when) => {
  let effective = null;
  let hasLab = false;
  memberships.forEach((ms) => {
    if (!ms.start || ms.start > when) return;
    if (MEMBER_TYPES.has(ms.type) && ms.memberend && ms.memberend > when) {
      if (!effective || ms.start >= effective.start) {
        effective = ms;
      }
    }
    if (ms.labend && ms.labend > when) {
      hasLab = true;
    }
  });
  if (!effective) return null;
  if (effective.family) return hasLab ? 'familyLab' : 'family';
  return hasLab ? 'individualLab' : 'individual';
};

/** Every distinct date at which one member's timeline can change. */
const boundariesOf = (memberships) => {
  const times = [];
  memberships.forEach((ms) => {
    if (ms.start) times.push(ms.start.getTime());
    if (ms.memberend) times.push(ms.memberend.getTime());
    if (ms.labend) times.push(ms.labend.getTime());
  });
  return [...new Set(times)].sort((a, b) => a - b).map((t) => new Date(t));
};

/**
 * Build the event series for all members.
 *
 * @param {Array<object>} memberships  All Membership documents
 * @return {{memberEvents: Array, individualEvents: Array,
 *           individualLabEvents: Array, familyEvents: Array,
 *           familyLabEvents: Array}}
 */
export const buildSeries = (memberships) => {
  const series = {
    memberEvents: [],
    individualEvents: [],
    individualLabEvents: [],
    familyEvents: [],
    familyLabEvents: [],
  };
  const seriesFor = {
    individual: series.individualEvents,
    individualLab: series.individualLabEvents,
    family: series.familyEvents,
    familyLab: series.familyLabEvents,
  };

  Object.values(groupByMember(memberships)).forEach(({ memberships: own }) => {
    let previous = null;
    boundariesOf(own).forEach((when) => {
      const category = categoryAt(own, when);
      if (category === previous) return;
      // Leaving/entering a category. The total only changes when the member
      // starts or stops being a member altogether — moving between categories
      // (an upgrade) leaves it untouched.
      if (previous) seriesFor[previous].push({ value: -1, when });
      if (category) seriesFor[category].push({ value: 1, when });
      if (!previous && category) series.memberEvents.push({ value: 1, when });
      if (previous && !category) series.memberEvents.push({ value: -1, when });
      previous = category;
    });
  });

  return series;
};

/**
 * Head count per category at a point in time. The categories are mutually
 * exclusive, so they sum to `total` — the same split the history page shows as
 * paying/member/lab/family/labfamily.
 *
 * @param {Array<object>} memberships  All Membership documents
 * @param {Date} when
 * @return {{total: number, individual: number, individualLab: number,
 *           family: number, familyLab: number}}
 */
export const countsAt = (memberships, when) => {
  const counts = { total: 0, individual: 0, individualLab: 0, family: 0, familyLab: 0 };
  Object.values(groupByMember(memberships)).forEach(({ memberships: own }) => {
    const category = categoryAt(own, when);
    if (!category) return;
    counts.total += 1;
    counts[category] += 1;
  });
  return counts;
};

const datesAreOnSameDay = (first, second) =>
  first && second &&
  first.getFullYear() === second.getFullYear() &&
  first.getMonth() === second.getMonth() &&
  first.getDate() === second.getDate();

/**
 * Sort events, merge those falling on the same day, drop anything in the future,
 * and accumulate into `{x, y}` points for the graphs. The final `y` is therefore
 * the head count as of today.
 *
 * @param {Array<{value: number, when: Date}>} events
 * @param {Date|number|null} from  Lower bound, null for "no bound"
 * @param {Date|number} to
 * @return {Array<{x: Date, y: number}>}
 */
export const sortAndAccumulate = (events, from, to) => {
  const now = new Date();
  const sorted = [...events]
    .filter((event) => event.when <= now)
    .sort((a, b) => (a.when < b.when ? -1 : 1));

  // Collapse events sharing a day into one, so a renewal (whose start equals the
  // previous end) nets out to a single no-op point instead of a dip.
  const perDay = [];
  sorted.forEach((event) => {
    const tail = perDay[perDay.length - 1];
    if (tail && datesAreOnSameDay(tail.when, event.when)) {
      tail.value += event.value;
    } else {
      perDay.push({ value: event.value, when: event.when });
    }
  });

  let accumulated = 0;
  return perDay.map((event) => {
    accumulated += event.value;
    return { x: event.when, y: accumulated };
  }).filter((pair) => ((from == null && pair.x < to) || (pair.x > from && pair.x < to)));
};
