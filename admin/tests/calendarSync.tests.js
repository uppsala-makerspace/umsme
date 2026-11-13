import assert from 'assert';
import { Meteor } from 'meteor/meteor';
import { Activities } from '/imports/common/collections/activities';
import { Events } from '/imports/common/collections/events';
import { Workshops } from '/imports/common/collections/workshops';
import { CalendarRemovals } from '/imports/common/collections/calendarRemovals';
import { AuditLog } from '/imports/common/collections/auditLog';
import { calendarEntry } from '/imports/common/lib/calendarEntry';
import { zonedDate } from '/imports/common/lib/days';
import { createActivity, updateActivity } from '/imports/common/server/activities/activities';
import { createEvent, updateEvent, removeEvent, currentEvent } from '/imports/common/server/activities/events';
import { syncCalendar, setCalendarTransportForTests } from '/imports/common/server/activities/calendarSync';

const prefix = 'caltest-';
const userId = `${prefix}user`;
const board = { userId, isAdminish: true };
const inDays = (n) => new Date(Date.now() + n * 86400000);

/** A calendar in memory, which can be told to fail. */
const fakeGoogle = () => {
  const events = new Map();
  const calls = [];
  let ids = 0;
  const state = { failing: null };
  const check = () => {
    if (state.failing) throw state.failing;
  };
  const gone = () => Object.assign(new Error('Not Found'), { status: 404 });
  return {
    events, calls, state,
    transport: {
      insert: async (body) => {
        check();
        ids += 1;
        const id = `${prefix}g${ids}`;
        events.set(id, body);
        calls.push(['insert', id]);
        return id;
      },
      update: async (id, body) => {
        check();
        if (!events.has(id)) throw gone();
        events.set(id, body);
        calls.push(['update', id]);
      },
      remove: async (id) => {
        check();
        if (!events.has(id)) throw gone();
        events.delete(id);
        calls.push(['remove', id]);
      },
    },
  };
};

const cleanup = async () => {
  await Events.removeAsync({ createdBy: userId });
  await Activities.removeAsync({ createdBy: userId });
  await Workshops.removeAsync({ _id: { $regex: `^${prefix}` } });
  await CalendarRemovals.removeAsync({ googleEventId: { $regex: `^${prefix}` } });
  await AuditLog.removeAsync({ userId });
};

describe('the Google calendar', function () {
  describe('calendarEntry', function () {
    const start = zonedDate(2026, 10, 19, 18, 0);
    const end = zonedDate(2026, 10, 19, 20, 30);
    const event = {
      _id: 'e1', published: true, status: 'confirmed', start, end,
      name: { sv: 'Täljkväll', en: 'Whittling night' }, description: { sv: 'Vi täljer.', en: 'We whittle.' },
    };

    it('says the Swedish name, both descriptions, the link and the place, in Swedish time', function () {
      const entry = calendarEntry(event, { workshopName: 'Träverkstaden', address: 'Uppsala Makerspace, Gatan 1', appUrl: 'https://app.example.org/' });
      assert.strictEqual(entry.summary, 'Täljkväll');
      assert.strictEqual(entry.description, 'Vi täljer.\n\nWe whittle.\n\nhttps://app.example.org/events/e1');
      assert.strictEqual(entry.location, 'Träverkstaden, Uppsala Makerspace, Gatan 1');
      assert.deepStrictEqual(entry.start, { dateTime: '2026-11-19T17:00:00.000Z', timeZone: 'Europe/Stockholm' });
      assert.strictEqual(entry.extendedProperties.private.umsmeEventId, 'e1');
      assert.strictEqual(entry.status, 'confirmed');
    });

    it('marks a called-off event, and leaves out what is missing', function () {
      const entry = calendarEntry({ ...event, status: 'cancelled', description: { sv: 'Bara svenska.' } });
      assert.strictEqual(entry.summary, 'INSTÄLLT: Täljkväll');
      assert.strictEqual(entry.description, 'Bara svenska.');
      assert.strictEqual(entry.location, '');
      assert.strictEqual(calendarEntry(event, { address: 'Gatan 1' }).location, 'Gatan 1');
    });

    it('names the hosts by first name, only when the event shows them on the website', function () {
      const hosted = { ...event, hostMemberIds: ['m1', 'm2', 'gone'] };
      const memberNames = { m1: 'Anna Andersson', m2: 'Bo Berg' };
      const appUrl = 'https://app.example.org';
      assert.strictEqual(
        calendarEntry({ ...hosted, hostsPublished: true }, { memberNames, appUrl }).description,
        'Vi täljer.\n\nWe whittle.\n\nVärdar / Hosts: Anna, Bo\n\nhttps://app.example.org/events/e1',
      );
      assert.ok(!calendarEntry(hosted, { memberNames }).description.includes('Värdar'));
      assert.ok(!calendarEntry({ ...hosted, hostsPublished: true, hostMemberIds: ['gone'] }, { memberNames }).description.includes('Värdar'));
    });

    it('writes midnight to midnight as whole days', function () {
      const entry = calendarEntry({ ...event, start: zonedDate(2026, 10, 21), end: zonedDate(2026, 10, 22) });
      assert.deepStrictEqual([entry.start, entry.end], [{ date: '2026-11-21' }, { date: '2026-11-22' }]);
    });

    it('is nothing for an event not shown on the website', function () {
      assert.strictEqual(calendarEntry({ ...event, published: false }), null);
      assert.strictEqual(calendarEntry({ ...event, published: undefined }), null);
    });
  });

  describe('syncCalendar', function () {
    let google;
    let saved;
    before(async function () {
      await cleanup();
      saved = Meteor.settings.private;
      Meteor.settings.private = { ...saved, googleCalendar: { calendarId: 'test', credentials: {}, location: 'Uppsala Makerspace' } };
    });
    after(async function () {
      setCalendarTransportForTests(null);
      Meteor.settings.private = saved;
      await cleanup();
    });
    beforeEach(function () {
      google = fakeGoogle();
      setCalendarTransportForTests(google.transport);
    });

    const entryOf = async (eventId) => google.events.get((await Events.findOneAsync(eventId)).googleEventId);

    it('puts a shown event in the calendar once, and leaves out one not shown', async function () {
      await Workshops.insertAsync({ _id: `${prefix}w`, name: { sv: 'Träverkstaden' }, kind: 'workshop', status: 'established' });
      const shown = await createEvent({ name: { sv: `${prefix}Visas` }, start: inDays(3), durationMinutes: 60, published: true, workshopId: `${prefix}w` }, board);
      const hidden = await createEvent({ name: { sv: `${prefix}Internt` }, start: inDays(3), durationMinutes: 60 }, board);
      await syncCalendar();
      const entry = await entryOf(shown);
      assert.strictEqual(entry.summary, `${prefix}Visas`);
      assert.strictEqual(entry.location, 'Träverkstaden, Uppsala Makerspace');
      assert.strictEqual((await Events.findOneAsync(hidden)).googleEventId, undefined);
      // Unchanged, it is not written again.
      const { googleEventId } = await Events.findOneAsync(shown);
      await syncCalendar();
      assert.deepStrictEqual(google.calls.filter(([, id]) => id === googleEventId), [['insert', googleEventId]]);
    });

    it('follows a change made to its activity, a call-off, and taking it off the website', async function () {
      const activityId = await createActivity({ name: { sv: `${prefix}Kurs` }, published: true }, { userId });
      const eventId = await createEvent({ activityId, start: inDays(4), durationMinutes: 90 }, board);
      await syncCalendar();
      const { googleEventId } = await Events.findOneAsync(eventId);
      assert.strictEqual(google.events.get(googleEventId).summary, `${prefix}Kurs`);

      const activity = await Activities.findOneAsync(activityId);
      await updateActivity(activityId, { name: { sv: `${prefix}Kursen` }, published: true }, { userId, expectedUpdatedAt: activity.updatedAt });
      await syncCalendar();
      assert.strictEqual(google.events.get(googleEventId).summary, `${prefix}Kursen`);

      const event = await currentEvent(eventId);
      await updateEvent(eventId, { activityId, start: event.start, end: event.end, status: 'cancelled', googleEventId }, board);
      await syncCalendar();
      assert.strictEqual(google.events.get(googleEventId).summary, `INSTÄLLT: ${prefix}Kursen`);

      const later = await Events.findOneAsync(eventId);
      await updateEvent(eventId, { activityId, start: later.start, end: later.end, status: 'cancelled', published: false, googleEventId }, board);
      await syncCalendar();
      assert.strictEqual(google.events.has(googleEventId), false);
      assert.strictEqual((await Events.findOneAsync(eventId)).googleEventId, undefined);
    });

    it('takes over an imported calendar event, and writes it anew when it is gone from Google', async function () {
      google.events.set(`${prefix}imported`, { summary: 'Från Google' });
      const eventId = await createEvent({
        name: { sv: `${prefix}Importerad` }, start: inDays(5), durationMinutes: 60, published: true, googleEventId: `${prefix}imported`,
      }, board);
      await syncCalendar();
      assert.strictEqual(google.events.get(`${prefix}imported`).summary, `${prefix}Importerad`);

      google.events.delete(`${prefix}imported`);
      await Events.updateAsync(eventId, { $set: { calendarHash: 'stale' } });
      await syncCalendar();
      const { googleEventId } = await Events.findOneAsync(eventId);
      assert.notStrictEqual(googleEventId, `${prefix}imported`);
      assert.strictEqual(google.events.get(googleEventId).summary, `${prefix}Importerad`);
    });

    it('takes a removed event out of the calendar', async function () {
      const eventId = await createEvent({ name: { sv: `${prefix}Bort` }, start: inDays(6), durationMinutes: 60, published: true }, board);
      await syncCalendar();
      const { googleEventId } = await Events.findOneAsync(eventId);
      await removeEvent(eventId, { userId });
      assert.strictEqual(await CalendarRemovals.find({ googleEventId }).countAsync(), 1);
      await syncCalendar();
      assert.strictEqual(google.events.has(googleEventId), false);
      assert.strictEqual(await CalendarRemovals.find({ googleEventId }).countAsync(), 0);
    });

    it('keeps a failure on the event and tries again the next time', async function () {
      const eventId = await createEvent({ name: { sv: `${prefix}Fel` }, start: inDays(7), durationMinutes: 60, published: true }, board);
      google.state.failing = new Error('Calendar down');
      const { failed } = await syncCalendar();
      assert.ok(failed >= 1);
      assert.strictEqual((await Events.findOneAsync(eventId)).calendarError, 'Calendar down');
      google.state.failing = null;
      await syncCalendar();
      const event = await Events.findOneAsync(eventId);
      assert.strictEqual(event.calendarError, undefined);
      assert.strictEqual(google.events.get(event.googleEventId).summary, `${prefix}Fel`);
    });
  });
});
