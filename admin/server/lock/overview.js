import { Meteor } from 'meteor/meteor';
import { Members } from '/imports/common/collections/members';
import { lockApi } from './index';

/**
 * The lab members against what the door lock holds for them: whether their
 * access ends when their lab membership does. Statuses:
 *
 *   correct    the lock's end date is the lab end date
 *   wrong      another end date, or a link without a calendar (fixable)
 *   forever    access without an end date
 *   admin      a lock administrator
 *   invited    a lock username the lock has no account for
 *   noaccount  no lock username
 *   old        lab ended and no access left
 */

const day = (date) => date.toISOString().substring(0, 10);
const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const endOf = (calendar) => (calendar?.rule_sets?.[0]?.end_time ? new Date(calendar.rule_sets[0].end_time) : null);

/** The lock's users by lowercased username, each with their link and calendar. */
const lockUsers = ({ users, links, calendars }) => {
  const calendarById = Object.fromEntries(calendars.map((c) => [c.id, c]));
  const linkByUser = Object.fromEntries(links.map((l) => [l.user_id, l]));
  return Object.fromEntries(users.map((user) => {
    const link = linkByUser[user.id] || null;
    return [user.username.toLowerCase(), { user, link, calendar: link?.calendar_id ? calendarById[link.calendar_id] || null : null }];
  }));
};

const hasAccess = (entry, now) => {
  if (!entry) return false;
  if (entry.user.role === 'administrator') return true;
  if (!entry.calendar) return false;
  const end = endOf(entry.calendar);
  return !end || now < end;
};

/** One row per lab member, from the lock's status (users, links, calendars). */
export const memberLockRows = (status, members, now = new Date()) => {
  const byUsername = lockUsers(status);
  return members.filter((m) => m.lab).map((member) => {
    const username = member.lock ? member.lock.toLowerCase() : null;
    const entry = username ? byUsername[username] : null;
    const row = {
      _id: member._id, name: member.name, email: member.email, infamily: !!member.infamily,
      labEnd: day(member.lab), lockUsername: username, lockId: entry?.user.id || null, lockEnd: null, fix: false,
    };
    if (!hasAccess(entry, now) && member.lab < now) return { ...row, status: 'old' };
    if (!username) return { ...row, status: 'noaccount' };
    if (!entry) return { ...row, status: 'invited' };
    if (entry.user.role === 'administrator') return { ...row, status: 'admin' };
    if (!entry.calendar) return { ...row, status: 'wrong', fix: true };
    const end = endOf(entry.calendar);
    if (!end) return { ...row, status: 'forever' };
    return { ...row, lockEnd: day(end), status: sameDay(end, member.lab) ? 'correct' : 'wrong', fix: !sameDay(end, member.lab) };
  });
};

const LAB_MEMBER_FIELDS = { name: 1, email: 1, lab: 1, lock: 1, infamily: 1 };

export const lockOverview = async () => {
  const status = await lockApi().status();
  const members = await Members.find({ lab: { $exists: true } }, { fields: LAB_MEMBER_FIELDS }).fetchAsync();
  return memberLockRows(status, members);
};

/** Make the lock's end date for a member their lab end date. */
export const fixLockEndDate = async (memberId) => {
  const member = await Members.findOneAsync(memberId, { fields: LAB_MEMBER_FIELDS });
  if (!member?.lab || !member.lock) throw new Meteor.Error('not-found', 'The member has no lab membership or lock username');
  const status = await lockApi().status();
  const entry = lockUsers(status)[member.lock.toLowerCase()];
  if (!entry) throw new Meteor.Error('no-account', 'The lock has no account for this member');
  const endDate = member.lab.toISOString();
  if (entry.link && entry.calendar) await lockApi().setCalendarEndDate(entry.calendar, endDate, entry.link);
  else await lockApi().createCalendarEndDate(entry.user.id, endDate);
};
