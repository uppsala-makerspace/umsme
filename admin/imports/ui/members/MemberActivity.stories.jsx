import { MemberActivity } from './MemberActivity';

export default {
  title: 'Members/MemberActivity',
  component: MemberActivity,
  args: { onScope: () => {} },
};

const MONTHS = ['2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'];
const sum = (counts) => counts.reduce((a, b) => a + b, 0);
const at = (iso) => new Date(iso);

const often = [9, 12, 7, 14, 11, 8, 3, 2, 10, 13, 15, 6];
const seldom = [0, 0, 2, 0, 0, 1, 0, 0, 0, 3, 0, 0];

const app = { hasAccount: true, lastSeenAt: at('2026-11-07T14:05:00') };
// A month's openings spread over its days, every third day, sometimes two the
// same day: a visit per day with an opening.
const daysFor = (month, count) => {
  const perDay = {};
  for (let k = 0; k < count; k += 1) {
    const day = `${month}-${String(((k * 3) % 28) + 1).padStart(2, '0')}`;
    perDay[day] = (perDay[day] || 0) + 1;
  }
  return Object.entries(perDay).map(([day, openings]) => ({ day, openings, visits: 1 }));
};

const doors = (counts, byDoor, lastUnlock) => {
  const days = MONTHS.flatMap((month, i) => daysFor(month, counts[i])).sort((a, b) => a.day.localeCompare(b.day));
  const visitsIn = (month) => days.filter((d) => d.day.startsWith(month)).length;
  return {
    lastUnlock,
    total: { openings: sum(counts), visits: days.length },
    months: MONTHS.map((month, i) => ({ month, openings: counts[i], visits: visitsIn(month) })),
    days,
    byDoor,
  };
};

// Not in a family: no choice between the member's and the family's openings.
const alone = { scope: 'member', family: [{ _id: 'm1', name: 'Maja Medlem' }] };
const family = [
  { _id: 'f1', name: 'Fredrik Familj' },
  { _id: 'f2', name: 'Frida Familj' },
  { _id: 'f3', name: 'Filip Familj' },
];

export const Active = {
  args: {
    activity: {
      ...alone,
      app,
      doors: doors(often, [{ door: 'outerDoor', count: 92 }, { door: 'upperFloor', count: 18 }],
        { timestamp: at('2026-11-07T18:42:00'), door: 'outerDoor', method: 'app' }),
    },
  },
};

export const Occasional = {
  args: {
    activity: {
      ...alone,
      app: { hasAccount: true, lastSeenAt: at('2026-09-21T09:10:00') },
      doors: doors(seldom, [{ door: 'outerDoor', count: 6 }],
        { timestamp: at('2026-09-20T11:03:00'), door: 'outerDoor', method: 'danalock' }),
    },
  },
};

export const NeverInApp = {
  args: {
    activity: {
      ...alone,
      app: { hasAccount: true, lastSeenAt: null },
      doors: doors(seldom, [{ door: 'outerDoor', count: 6 }],
        { timestamp: at('2026-09-20T11:03:00'), door: 'outerDoor', method: 'danalock' }),
    },
  },
};

export const NoAccount = {
  args: {
    activity: {
      ...alone,
      app: { hasAccount: false, lastSeenAt: null },
      doors: doors(Array(12).fill(0), [], { timestamp: at('2024-05-02T16:30:00'), door: 'outerDoor', method: 'danalock' }),
    },
  },
};

export const NoActivity = {
  args: {
    activity: { ...alone, app: { hasAccount: true, lastSeenAt: null }, doors: doors(Array(12).fill(0), [], null) },
  },
};

// A family member's page: the member's own openings (the default) …
export const FamilyMember = {
  args: {
    activity: {
      scope: 'member', family,
      app: { hasAccount: true, lastSeenAt: at('2026-10-30T19:20:00') },
      doors: doors(seldom, [{ door: 'outerDoor', count: 6 }],
        { timestamp: at('2026-09-20T11:03:00'), door: 'outerDoor', method: 'app', memberid: 'f1' }),
    },
  },
};

// … or the whole family's, with whose the latest opening was.
export const WholeFamily = {
  args: {
    activity: {
      scope: 'family', family,
      app: { hasAccount: true, lastSeenAt: at('2026-10-30T19:20:00') },
      doors: doors(often, [{ door: 'outerDoor', count: 104 }, { door: 'upperFloor', count: 6 }],
        { timestamp: at('2026-11-06T16:12:00'), door: 'outerDoor', method: 'app', memberid: 'f2' }),
    },
  },
};

export const Loading = { args: { loading: true } };

export const WithError = { args: { error: 'Not authorized' } };
