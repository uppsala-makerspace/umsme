import { Email } from 'meteor/email';
import { Meteor } from 'meteor/meteor';
import { template as compile } from 'underscore';
import { Members } from '/imports/common/collections/members';
import { Messages } from '/imports/common/collections/messages';
import { Spaces } from '/imports/common/collections/spaces';
import { findBestTemplate, memberTemplateData } from '/imports/common/lib/message';
import { appLink } from '/imports/common/lib/links';
import { checkInApplies, checkInWindow } from '/imports/common/lib/activityRules';
import { isEmailAllowed } from '/imports/common/server/emailGuard';
import { pushMessage } from '/imports/common/server/push';
import { publishManagerEvent, ManagerEventType } from '/imports/common/server/managerEvents';

/**
 * Messages about events to members: a push and a mail from the template of
 * each type, which administrators edit under Templates (defaults in
 * ./defaultTemplates.js), kept as a member message like every other. A
 * missing template, or a failing send, is logged and never stops the
 * registration it is about.
 */

export const ACTIVITY_TEMPLATE_TYPES = Object.freeze({
  registered: 'activityRegistered',
  queued: 'activityQueued',
  seatFree: 'activitySeatFree',
  cancelled: 'activityCancelled',
  confirmed: 'activityConfirmed',
  newEvent: 'activityNewEvent',
  checkInOpen: 'activityCheckInOpen',
  missedCheckIn: 'activityMissedCheckIn',
});

const DEFAULT_FROM = 'Uppsala Makerspace <info@uppsalamakerspace.se>';
const settings = () => Meteor.settings?.private?.activityNotifications || {};

let transportOverride;
const transports = () => transportOverride || {
  sendEmail: (options) => Email.sendAsync(options),
  sendPush: (messageId) => pushMessage(messageId),
};

/** Replace mail and push in tests: `{ sendEmail, sendPush }`, or null for the real ones. */
export const setActivityTransportsForTests = (value) => {
  transportOverride = value;
};

const pad = (n) => String(n).padStart(2, '0');
const when = (date) => (date
  ? `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
  : '');

const eventData = async (event, extra = {}) => {
  const space = event.spaceId ? await Spaces.findOneAsync(event.spaceId, { fields: { name: 1 } }) : null;
  return {
    eventName: event.name?.sv || event.name?.en || '',
    eventNameEn: event.name?.en || event.name?.sv || '',
    eventDate: when(event.start),
    eventPlace: space?.name?.sv || '',
    eventLink: appLink(`/events/${event._id}`),
    freeSeats: 0,
    checkInDeadline: checkInApplies(event) ? when(checkInWindow(event).closes) : '',
    ...extra,
  };
};

const memberType = (member) => (member.youth ? 'youth' : member.family ? 'family' : 'normal');

/** Send one member the message of a type about an event. */
const send = async (kind, event, memberId, extra = {}) => {
  const type = ACTIVITY_TEMPLATE_TYPES[kind];
  try {
    const member = await Members.findOneAsync(memberId);
    if (!member) return;
    const template = await findBestTemplate({ auto: true, type, membertype: memberType(member) });
    if (!template) {
      console.warn(`[activities] no message template of type "${type}"; add one under Templates in admin`);
      return;
    }
    const data = { ...(await memberTemplateData(member)), name: member.name || '', ...(await eventData(event, extra)) };
    const subject = compile(template.subject)(data);
    const messagetext = compile(template.messagetext)(data);
    const messageId = await Messages.insertAsync({
      template: template._id, member: member._id, type: 'activity',
      to: member.email || 'In-app', subject, senddate: new Date(), messagetext,
    });
    try {
      await transports().sendPush(messageId);
    } catch (error) {
      console.error(`[activities] push failed for ${messageId}: ${error.message}`);
    }
    if (member.email && Meteor.settings.deliverMails && isEmailAllowed(member.email)) {
      await transports().sendEmail({
        to: member.email, from: settings().from || DEFAULT_FROM, replyTo: settings().replyTo || undefined, subject, text: messagetext,
      });
    }
  } catch (error) {
    console.error(`[activities] ${type} to ${memberId} failed: ${error.message}`);
  }
};

const sendAll = async (kind, event, memberIds, extra) => {
  for (const memberId of [...new Set(memberIds)]) await send(kind, event, memberId, extra);
};

/** A member signed up: a seat (approved or checked in), or a place in the queue. */
export const registered = (event, registration) =>
  send(registration.state === 'queued' ? 'queued' : 'registered', event, registration.memberId);

/** Seats have become free: everyone in the queue, at once; the first to take one has it. */
export const seatsFreed = (event, queued, freeSeats) =>
  sendAll('seatFree', event, queued.map((r) => r.memberId), { freeSeats });

/** The event was called off: everyone who had a seat or queued. */
export const eventCancelled = (event, registrations) =>
  sendAll('cancelled', event, registrations.map((r) => r.memberId));

/** Enough have signed up: the event happens. Its hosts, and the managers' channels. */
export const eventConfirmed = async (event) => {
  await sendAll('confirmed', event, event.hostMemberIds || []);
  await publishManagerEvent(ManagerEventType.ACTIVITY_EVENT_CONFIRMED, {
    subject: 'Event happens',
    body: `*${event.name?.sv || ''}* ${when(event.start)} has enough participants and happens.`,
  });
};

/** A new event of an activity: those interested in it. */
export const newEvent = (event, memberIds) => sendAll('newEvent', event, memberIds);

/** Check-in has opened: everyone with a seat. */
export const checkInOpen = (event, registrations) =>
  sendAll('checkInOpen', event, registrations.map((r) => r.memberId));

/** The check-in deadline passed without them: their seats went to the queue. */
export const missedCheckIn = (event, registrations) =>
  sendAll('missedCheckIn', event, registrations.map((r) => r.memberId));
