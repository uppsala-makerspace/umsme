import { Members } from '/imports/common/collections/members';
import { FakeLockState, FAKE_LOCK_ID } from '/imports/common/server/fakeLockApi';

/**
 * The fake door lock's state for a scenario (see common/server/fakeLockApi.js).
 * Each entry gives the member a lock account (their `lock` username, their
 * email) and says what the lock holds for it:
 *
 *   end: 'lab'       a calendar ending when their lab membership does
 *   end: n           a calendar ending n days after that (n < 0: before)
 *   end: 'none'      a link without a calendar
 *   end: 'forever'   a calendar without an end
 *   admin: true      an administrator
 *   account: false   the member has a lock username, the lock no account
 *
 * `visits` adds door openings to the log, days back from `now`.
 */
export const makeFakeLock = async (entries, { now }) => {
  const users = [];
  const calendars = [];
  const links = [];
  const log = [];
  for (const [i, { member: { _id }, end = 'lab', admin = false, account = true, visits = [] }] of entries.entries()) {
    const member = await Members.findOneAsync(_id);
    const username = member.email;
    await Members.updateAsync(_id, { $set: { lock: username } });
    if (!account) continue;
    const userId = `user-fake${i}`;
    users.push({ id: userId, username, role: admin ? 'administrator' : 'user' });
    if (end !== 'none') {
      const calendarId = `calendar-fake${i}`;
      const ends = end === 'forever' ? null
        : new Date((member.lab || now).getTime() + (end === 'lab' ? 0 : end) * 24 * 3600 * 1000).toISOString();
      calendars.push({ id: calendarId, start_time: now.toISOString(), rule_sets: [{ end_time: ends }] });
      links.push({ id: `group_user-fake${i}`, user_id: userId, calendar_id: calendarId, group_id: 'group-fake', link_profile: admin ? 'administrator' : 'user' });
    } else {
      links.push({ id: `group_user-fake${i}`, user_id: userId, calendar_id: null, group_id: 'group-fake', link_profile: 'user' });
    }
    for (const daysAgo of visits) {
      log.push({ timestamp: new Date(now.getTime() - daysAgo * 24 * 3600 * 1000).toISOString(), lock: 'lock-fake', user: userId, username: `${username}:1`, operation: 'unlocked' });
    }
  }
  log.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  await FakeLockState.removeAsync({});
  await FakeLockState.insertAsync({ _id: FAKE_LOCK_ID, users, calendars, links, log });
};
