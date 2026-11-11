import { MessageTemplates } from '/imports/common/collections/templates';
import { ACTIVITY_TEMPLATE_TYPES } from './notify';

const bilingual = (swedish, english, separator = '\n\n---\n\n') => `${swedish}${separator}${english}`;
const place = '<% if (eventPlace) { %> i <%= eventPlace %><% } %>';
const placeEn = '<% if (eventPlace) { %> in <%= eventPlace %><% } %>';
const link = '<% if (eventLink) { %>\n\n<%= eventLink %><% } %>';
const regards = '\n\nVänliga hälsningar\nUppsala Makerspace';
const regardsEn = '\n\nKind regards\nUppsala Makerspace';

/**
 * The texts the activity messages ship with. Inserted as editable templates
 * when a database has no template of a type at all, so an administrator who
 * rewrites or deprecates one is never overruled by the code.
 */
export const ACTIVITY_DEFAULT_TEMPLATES = [
  {
    type: ACTIVITY_TEMPLATE_TYPES.registered,
    name: 'Activity: registered',
    subject: bilingual('Du är anmäld: <%= eventName %>', 'You are registered: <%= eventNameEn %>', ' — '),
    messagetext: bilingual(
      `Hej <%= name %>!\n\nDu har en plats på <%= eventName %> <%= eventDate %>${place}. Kan du inte komma, avanmäl dig i appen så att någon annan får platsen.${link}${regards}`,
      `Hello <%= name %>!\n\nYou have a seat at <%= eventNameEn %> <%= eventDate %>${placeEn}. If you cannot come, withdraw in the app so that someone else gets the seat.${link}${regardsEn}`,
    ),
  },
  {
    type: ACTIVITY_TEMPLATE_TYPES.queued,
    name: 'Activity: in the queue',
    subject: bilingual('Du står i kö: <%= eventName %>', 'You are in the queue: <%= eventNameEn %>', ' — '),
    messagetext: bilingual(
      `Hej <%= name %>!\n\n<%= eventName %> <%= eventDate %> är fullt och du står i kö. Blir en plats ledig får alla i kön besked, och den som först tar den i appen får den.${link}${regards}`,
      `Hello <%= name %>!\n\n<%= eventNameEn %> <%= eventDate %> is full and you are in the queue. When a seat becomes free everyone in the queue is told, and whoever takes it first in the app has it.${link}${regardsEn}`,
    ),
  },
  {
    type: ACTIVITY_TEMPLATE_TYPES.seatFree,
    name: 'Activity: a seat is free',
    subject: bilingual('En plats är ledig: <%= eventName %>', 'A seat is free: <%= eventNameEn %>', ' — '),
    messagetext: bilingual(
      `Hej <%= name %>!\n\n<% if (freeSeats > 1) { %><%= freeSeats %> platser har<% } else { %>En plats har<% } %> blivit ledig på <%= eventName %> <%= eventDate %>. Först till kvarn: ta den i appen.${link}${regards}`,
      `Hello <%= name %>!\n\n<% if (freeSeats > 1) { %><%= freeSeats %> seats have<% } else { %>A seat has<% } %> become free at <%= eventNameEn %> <%= eventDate %>. First come, first served: take it in the app.${link}${regardsEn}`,
    ),
  },
  {
    type: ACTIVITY_TEMPLATE_TYPES.cancelled,
    name: 'Activity: event called off',
    subject: bilingual('Inställt: <%= eventName %>', 'Called off: <%= eventNameEn %>', ' — '),
    messagetext: bilingual(
      `Hej <%= name %>!\n\n<%= eventName %> <%= eventDate %> är tyvärr inställt.${link}${regards}`,
      `Hello <%= name %>!\n\n<%= eventNameEn %> <%= eventDate %> has unfortunately been called off.${link}${regardsEn}`,
    ),
  },
  {
    type: ACTIVITY_TEMPLATE_TYPES.confirmed,
    name: 'Activity: event happens',
    subject: bilingual('Det blir av: <%= eventName %>', 'It happens: <%= eventNameEn %>', ' — '),
    messagetext: bilingual(
      `Hej <%= name %>!\n\nTillräckligt många har anmält sig till <%= eventName %> <%= eventDate %>, som du är värd för. Det blir av.${link}${regards}`,
      `Hello <%= name %>!\n\nEnough have signed up for <%= eventNameEn %> <%= eventDate %>, which you host. It happens.${link}${regardsEn}`,
    ),
  },
  {
    type: ACTIVITY_TEMPLATE_TYPES.newEvent,
    name: 'Activity: new event',
    subject: bilingual('Nytt tillfälle: <%= eventName %>', 'New event: <%= eventNameEn %>', ' — '),
    messagetext: bilingual(
      `Hej <%= name %>!\n\nDu har visat intresse för <%= eventName %>, och nu finns ett tillfälle: <%= eventDate %>${place}.${link}${regards}`,
      `Hello <%= name %>!\n\nYou showed interest in <%= eventNameEn %>, and now there is an event: <%= eventDate %>${placeEn}.${link}${regardsEn}`,
    ),
  },
  {
    type: ACTIVITY_TEMPLATE_TYPES.checkInOpen,
    name: 'Activity: check in',
    subject: bilingual('Checka in: <%= eventName %>', 'Check in: <%= eventNameEn %>', ' — '),
    messagetext: bilingual(
      `Hej <%= name %>!\n\nBekräfta i appen att du kommer på <%= eventName %> <%= eventDate %><% if (checkInDeadline) { %> senast <%= checkInDeadline %><% } %>. Annars går din plats till kön.${link}${regards}`,
      `Hello <%= name %>!\n\nConfirm in the app that you are coming to <%= eventNameEn %> <%= eventDate %><% if (checkInDeadline) { %> by <%= checkInDeadline %><% } %>. Otherwise your seat goes to the queue.${link}${regardsEn}`,
    ),
  },
  {
    type: ACTIVITY_TEMPLATE_TYPES.checkInLastCall,
    name: 'Activity: check in, last call',
    subject: bilingual('Snart för sent att checka in: <%= eventName %>', 'Soon too late to check in: <%= eventNameEn %>', ' — '),
    messagetext: bilingual(
      `Hej <%= name %>!\n\nDu har inte checkat in till <%= eventName %> <%= eventDate %> än. Bekräfta i appen att du kommer<% if (checkInDeadline) { %> senast <%= checkInDeadline %><% } %>, annars går din plats till kön.${link}${regards}`,
      `Hello <%= name %>!\n\nYou have not checked in for <%= eventNameEn %> <%= eventDate %> yet. Confirm in the app that you are coming<% if (checkInDeadline) { %> by <%= checkInDeadline %><% } %>, or your seat goes to the queue.${link}${regardsEn}`,
    ),
  },
  {
    type: ACTIVITY_TEMPLATE_TYPES.missedCheckIn,
    name: 'Activity: missed check-in',
    subject: bilingual('Din plats har gått vidare: <%= eventName %>', 'Your seat has gone on: <%= eventNameEn %>', ' — '),
    messagetext: bilingual(
      `Hej <%= name %>!\n\nDu checkade inte in till <%= eventName %> <%= eventDate %> i tid, så din plats har gått till kön.${link}${regards}`,
      `Hello <%= name %>!\n\nYou did not check in for <%= eventNameEn %> <%= eventDate %> in time, so your seat has gone to the queue.${link}${regardsEn}`,
    ),
  },  {
    type: ACTIVITY_TEMPLATE_TYPES.reminderDayBefore,
    name: 'Activity: reminder, day before',
    subject: bilingual('Påminnelse: <%= eventName %> i morgon', 'Reminder: <%= eventNameEn %> tomorrow', ' — '),
    messagetext: bilingual(
      `Hej <%= name %>!\n\nDu har en plats på <%= eventName %> <%= eventDate %>${place}. Kan du inte komma, avanmäl dig i appen så att någon annan kan ta platsen.${link}${regards}`,
      `Hello <%= name %>!\n\nYou have a seat at <%= eventNameEn %> <%= eventDate %>${placeEn}. If you cannot come, withdraw in the app so that someone else can take the seat.${link}${regardsEn}`,
    ),
  },
  {
    type: ACTIVITY_TEMPLATE_TYPES.reminderSoon,
    name: 'Activity: reminder, two hours before',
    subject: bilingual('Snart: <%= eventName %>', 'Soon: <%= eventNameEn %>', ' — '),
    messagetext: bilingual(
      `Hej <%= name %>!\n\n<%= eventName %> börjar <%= eventDate %>${place}. Välkommen! Kan du inte komma, avanmäl dig i appen så att någon annan kan ta platsen.${link}${regards}`,
      `Hello <%= name %>!\n\n<%= eventNameEn %> starts <%= eventDate %>${placeEn}. Welcome! If you cannot come, withdraw in the app so that someone else can take the seat.${link}${regardsEn}`,
    ),
  },
  {
    type: ACTIVITY_TEMPLATE_TYPES.hostDayBefore,
    name: 'Activity: hosts, day before',
    subject: bilingual('Du är värd i morgon: <%= eventName %>', 'You host tomorrow: <%= eventNameEn %>', ' — '),
    messagetext: bilingual(
      `Hej <%= name %>!\n\nDu är värd för <%= eventName %> <%= eventDate %>${place}.\n\nAnmälda: <%= participants %><% if (seats) { %> av <%= seats %><% } %>\nI kö: <%= queued %>\n\nDeltagarna ser du på tillfällets sida i appen.${link}${regards}`,
      `Hello <%= name %>!\n\nYou host <%= eventNameEn %> <%= eventDate %>${placeEn}.\n\nSigned up: <%= participants %><% if (seats) { %> of <%= seats %><% } %>\nIn the queue: <%= queued %>\n\nThe participants are on the event's page in the app.${link}${regardsEn}`,
    ),
  },
  {
    type: ACTIVITY_TEMPLATE_TYPES.hostSoon,
    name: 'Activity: hosts, two hours before',
    subject: bilingual('Du är värd snart: <%= eventName %>', 'You host soon: <%= eventNameEn %>', ' — '),
    messagetext: bilingual(
      `Hej <%= name %>!\n\n<%= eventName %> börjar <%= eventDate %>${place}. Anmälda: <%= participants %><% if (seats) { %> av <%= seats %><% } %>, i kö: <%= queued %>.${link}${regards}`,
      `Hello <%= name %>!\n\n<%= eventNameEn %> starts <%= eventDate %>${placeEn}. Signed up: <%= participants %><% if (seats) { %> of <%= seats %><% } %>, in the queue: <%= queued %>.${link}${regardsEn}`,
    ),
  },
];

/** Insert the default template for every activity type that has none yet. Returns the types seeded. */
export const ensureActivityMessageTemplates = async ({ now = new Date() } = {}) => {
  const seeded = [];
  for (const defaults of ACTIVITY_DEFAULT_TEMPLATES) {
    if (await MessageTemplates.findOneAsync({ type: defaults.type }, { fields: { _id: 1 } })) continue;
    await MessageTemplates.insertAsync({ ...defaults, auto: true, deprecated: false, created: now, modified: now });
    seeded.push(defaults.type);
  }
  if (seeded.length) console.log(`[activities] seeded message templates: ${seeded.join(', ')}`);
  return seeded;
};
