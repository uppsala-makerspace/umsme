import assert from 'assert';
import { Meteor } from 'meteor/meteor';
import { Activities } from '/imports/common/collections/activities';
import { Events } from '/imports/common/collections/events';
import { AuditLog } from '/imports/common/collections/auditLog';
import { createActivity } from '/imports/common/server/activities/activities';
import { createEvent } from '/imports/common/server/activities/events';
import {
  createActivityFromEvent, matchingEvents, linkEvents, normalizedName,
} from '/imports/common/server/activities/linking';
import { calendarPreview, importCalendarEvents } from '/imports/common/server/activities/calendarImport';

const prefix = 'linktest-';
const userId = `${prefix}user`;
const board = { userId, isAdminish: true };
const DAY = 86400000;
const inDays = (n) => new Date(Date.now() + n * DAY);

const cleanup = async () => {
  await Events.removeAsync({ $or: [{ createdBy: userId }, { googleEventId: { $regex: '^fake-' } }] });
  await Activities.removeAsync({ createdBy: userId });
  await AuditLog.removeAsync({ userId });
};

describe('linking events to activities', function () {
  before(cleanup);
  after(cleanup);

  it('compares names without case or spaces', function () {
    assert.strictEqual(normalizedName('  Öppen   Kväll '), 'öppen kväll');
  });

  it('makes an activity of a free-standing event, which becomes its first', async function () {
    const eventId = await createEvent({
      name: { sv: `${prefix}Täljkväll` }, description: { sv: 'Täljning.' }, start: inDays(3), durationMinutes: 150,
      registration: 'optional', maxSeats: 8,
    }, board);
    const activityId = await createActivityFromEvent(eventId, { userId });
    const activity = await Activities.findOneAsync(activityId);
    assert.deepStrictEqual([activity.name.sv, activity.description.sv, activity.durationMinutes, activity.registration, activity.maxSeats],
      [`${prefix}Täljkväll`, 'Täljning.', 150, 'optional', 8]);
    const event = await Events.findOneAsync(eventId);
    assert.strictEqual(event.activityId, activityId);
    // What it says as the activity does is left to the activity.
    assert.deepStrictEqual([event.name, event.description, event.maxSeats], [undefined, undefined, undefined]);
    await assert.rejects(createActivityFromEvent(eventId, { userId }), (e) => e.error === 'linked');
  });

  it('finds the free-standing events with an activity’s name and takes them in', async function () {
    const activityId = await createActivity({ name: { sv: `${prefix}Öppen kväll`, en: 'Open evening' }, durationMinutes: 180 }, { userId });
    const same = await createEvent({ name: { sv: ` ${prefix}öppen  KVÄLL` }, start: inDays(-7), durationMinutes: 180 }, board);
    const english = await createEvent({ name: { sv: 'Open evening' }, start: inDays(7), durationMinutes: 120 }, board);
    await createEvent({ name: { sv: `${prefix}Städdag` }, start: inDays(7), durationMinutes: 60 }, board);
    const found = (await matchingEvents(activityId)).map((e) => e._id).sort();
    assert.deepStrictEqual(found, [same, english].sort());
    assert.strictEqual(await linkEvents(activityId, found, { userId }), 2);
    const linked = await Events.findOneAsync(same);
    assert.strictEqual(linked.activityId, activityId);
    assert.strictEqual(linked.name, undefined);
    assert.deepStrictEqual(await matchingEvents(activityId), []);
  });
});

describe('importing the calendar', function () {
  let saved;
  before(async function () {
    await cleanup();
    saved = Meteor.settings.private;
    Meteor.settings.private = { ...(saved || {}), googleCalendar: 'fake' };
  });
  after(async function () {
    Meteor.settings.private = saved;
    await cleanup();
  });

  it('imports each calendar event once, of an activity with its name', async function () {
    const activityId = await createActivity({ name: { sv: 'Öppen kväll' }, durationMinutes: 180 }, { userId });
    const from = inDays(-30);
    const to = inDays(30);
    const preview = await calendarPreview({ from, to });
    const evenings = preview.filter((i) => i.name === 'Öppen kväll');
    assert.strictEqual(evenings.length, 5);
    assert.ok(evenings.every((i) => i.activityId === activityId && !i.eventId));
    const fair = preview.find((i) => i.name === 'Makermässa');
    assert.strictEqual(fair.allDay, true);
    assert.strictEqual(fair.end - fair.start, DAY);

    const ids = preview.map((i) => i.googleEventId);
    const first = await importCalendarEvents({ from, to, googleEventIds: ids }, { userId });
    assert.deepStrictEqual(first, { created: preview.length, skipped: 0 });
    const again = await importCalendarEvents({ from, to, googleEventIds: ids }, { userId });
    assert.deepStrictEqual(again, { created: 0, skipped: preview.length });

    const evening = await Events.findOneAsync({ googleEventId: evenings[0].googleEventId });
    assert.strictEqual(evening.activityId, activityId);
    assert.strictEqual(evening.name, undefined);
    // Shown on the website, as they were in the open calendar, so that the calendar sync keeps them.
    assert.strictEqual(evening.published, true);
    const cleaning = await Events.findOneAsync({ googleEventId: 'fake-staddag' });
    assert.deepStrictEqual(cleaning.name, { sv: 'Städdag i lokalen' });
    assert.strictEqual(cleaning.published, true);
    await Activities.removeAsync(activityId);
  });
});
