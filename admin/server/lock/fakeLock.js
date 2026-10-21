import { Random } from 'meteor/random';
import { FakeLockState, FAKE_LOCK_ID } from '/imports/common/server/fakeLockApi';

/**
 * A stand-in for the Danalock API (danalock.js) that keeps its state in the
 * database, so that development, the demo and the e2e tests can use the lock
 * pages without the real door. Chosen with "lockApi": "fake" in the settings;
 * the seeds give it its state (common/server/seed/lock.js).
 */

const state = async () => {
  const doc = await FakeLockState.findOneAsync(FAKE_LOCK_ID);
  return doc || { users: [], calendars: [], links: [], log: [] };
};
const save = (doc) => FakeLockState.upsertAsync(FAKE_LOCK_ID, { $set: { users: doc.users, calendars: doc.calendars, links: doc.links, log: doc.log } });

export const fakeLock = {
  async status() {
    const { users, calendars, links } = await state();
    return { users, calendars, links };
  },

  async log({ page = 0, perPage = 50 } = {}) {
    return (await state()).log.slice(page * perPage, (page + 1) * perPage);
  },

  async setCalendarEndDate(calendar, endDate, link) {
    const doc = await state();
    const id = `calendar-fake-${Random.id()}`;
    doc.calendars = doc.calendars.filter((c) => c.id !== calendar.id)
      .concat({ ...calendar, id, rule_sets: [{ ...calendar.rule_sets[0], end_time: endDate }] });
    doc.links = doc.links.map((l) => (l.id === link.id ? { ...l, calendar_id: id } : l));
    await save(doc);
  },

  async createCalendarEndDate(userId, endDate) {
    const doc = await state();
    const suffix = Random.id();
    const id = `calendar-fake-${suffix}`;
    doc.calendars.push({ id, start_time: new Date().toISOString(), rule_sets: [{ end_time: endDate }] });
    const existing = doc.links.find((l) => l.user_id === userId);
    if (existing) doc.links = doc.links.map((l) => (l === existing ? { ...l, calendar_id: id } : l));
    else doc.links.push({ id: `group_user-fake-${suffix}`, user_id: userId, calendar_id: id, group_id: 'group-fake', link_profile: 'user' });
    await save(doc);
  },
};
