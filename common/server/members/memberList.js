import { Meteor } from 'meteor/meteor';
import { Members } from '/imports/common/collections/members';
import { overdueReminderDays, reminderDays } from '/imports/common/lib/rules';

/**
 * Pages of members for the admin lists: the views (all, excluded, the
 * reminder window), searched, sorted and paged on the server, since the
 * whole list runs to thousands. Each row carries what the lists show,
 * including the reminder state, worked out here.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const MEMBER_LIST_FIELDS = {
  mid: 1, name: 1, email: 1, mobile: 1, family: 1, infamily: 1, youth: 1, liability: 1,
  member: 1, lab: 1, reminder: 1, lock: 1, storage: 1, excluded: 1, registered: 1,
};
export const MEMBER_LIST_SORTS = ['mid', 'name', 'email', 'member', 'lab', 'reminder', 'family', 'youth', 'liability', 'lock', 'storage', 'mobile'];

/** The members a view holds, as a selector. */
export const MEMBER_LIST_VIEWS = {
  all: () => ({}),
  excluded: () => ({ excluded: true }),
  reminders: (now = new Date()) => {
    const start = new Date(now.getTime() - overdueReminderDays * DAY_MS);
    const end = new Date(now.getTime() + reminderDays * DAY_MS);
    return {
      infamily: { $exists: false },
      $or: [{ member: { $gt: start, $lt: end } }, { lab: { $gt: start, $lt: end } }],
    };
  },
};

/**
 * Whether a member is due a reminder: 'done' (reminded lately), 'needed'
 * (ends within the window), 'overdue' (ended lately), 'old' (reminded long
 * ago) or 'none'; null for a family member, whose payer is reminded.
 */
export const reminderStateOf = (member, now = new Date()) => {
  if (member.infamily) return null;
  const reminderTime = new Date(now.getTime() + reminderDays * DAY_MS);
  const overdueTime = new Date(now.getTime() - overdueReminderDays * DAY_MS);
  const ends = [member.member, member.lab].filter(Boolean);
  if (member.reminder && member.reminder > new Date(now.getTime() - reminderDays * 2 * DAY_MS)) return 'done';
  if (ends.some((d) => d > now && d < reminderTime)) return 'needed';
  if (ends.some((d) => d < now && d > overdueTime)) return 'overdue';
  return member.reminder ? 'old' : 'none';
};

const searchSelector = (search) => {
  const words = (search || '').trim().split(/\s+/).filter(Boolean).slice(0, 5);
  if (!words.length) return null;
  return {
    $and: words.map((word) => {
      const pattern = new RegExp(escape(word), 'i');
      return { $or: [{ name: pattern }, { email: pattern }, { mid: pattern }, { mobile: pattern }, { storage: pattern }] };
    }),
  };
};

/**
 * One page of a view.
 *
 * @param {{ view: string, search?: string, sort?: { field: string, direction: 'asc'|'desc' },
 *           page?: number, pageSize?: number }} options
 * @returns {Promise<{ rows: object[], total: number }>}
 */
export const memberListPage = async ({ view, search, sort, page = 0, pageSize = 50 }) => {
  const viewSelector = MEMBER_LIST_VIEWS[view];
  if (!viewSelector) throw new Meteor.Error('bad-view', `No member list "${view}"`);
  if (sort && !MEMBER_LIST_SORTS.includes(sort.field)) throw new Meteor.Error('bad-sort', `Cannot sort by "${sort.field}"`);
  const size = Math.min(Math.max(1, pageSize), 200);
  const found = searchSelector(search);
  const base = viewSelector();
  const selector = found ? { $and: [base, found] } : base;
  const order = sort ? { [sort.field]: sort.direction === 'desc' ? -1 : 1, _id: 1 } : { name: 1, _id: 1 };
  const [members, total] = await Promise.all([
    Members.find(selector, { fields: MEMBER_LIST_FIELDS, sort: order, skip: Math.max(0, page) * size, limit: size }).fetchAsync(),
    Members.find(selector).countAsync(),
  ]);
  const now = new Date();
  return { rows: members.map((m) => ({ ...m, reminderState: reminderStateOf(m, now) })), total };
};
