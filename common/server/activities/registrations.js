import { Meteor } from 'meteor/meteor';
import { Activities } from '/imports/common/collections/activities';
import { Events } from '/imports/common/collections/events';
import { EventRegistrations } from '/imports/common/collections/eventRegistrations';
import { ActivityInterests } from '/imports/common/collections/activityInterests';
import { recordChange } from '/imports/common/server/auditLog';
import {
  HOLDING, PENDING, resolveEvent, registrationOpen, registrationOutcome, statusFor, seatsLeft,
  mayWithdraw, mayTakeSeat, mayCheckIn, checkInApplies, checkInWindow, checkInClosed, takesRegistrations,
} from '/imports/common/lib/activityRules';
import { hasValidCertificate } from './certificates';
import * as notify from './notify';

/**
 * Registrations to events, the queue, check-in and attendance
 * (plan/activities.md, stages 2 and 3). Who may act is the caller's to check
 * (a member for themselves, an event's hosts and board/admin for attendance);
 * these functions keep the data whole and tell those concerned.
 *
 * Seats are counted on the event (`seatsTaken`, the registrations in HOLDING)
 * and taken with a conditional increment, so two members can never get the
 * last seat: whoever's update lands first has it.
 */

const DOMAIN = 'eventRegistrations';

/** An event as it applies, resolved against its activity. */
export const resolvedEvent = async (eventId) => {
  const event = await Events.findOneAsync(eventId);
  if (!event) throw new Meteor.Error('not-found', 'No such event');
  const activity = event.activityId ? await Activities.findOneAsync(event.activityId) : null;
  return { event, activity, resolved: resolveEvent(event, activity) };
};

/** Take a seat if one is free: true when taken. */
const takeSeatOf = async (resolved) => {
  const room = resolved.maxSeats
    ? { $or: [{ seatsTaken: { $exists: false } }, { seatsTaken: { $lt: resolved.maxSeats } }] }
    : {};
  return (await Events.updateAsync({ _id: resolved._id, ...room }, { $inc: { seatsTaken: 1 } })) === 1;
};

const releaseSeats = (eventId, count = 1) =>
  (count > 0 ? Events.updateAsync({ _id: eventId }, { $inc: { seatsTaken: -count } }) : null);

const setState = async (registration, state, { userId, now = new Date(), extra = {} } = {}) => {
  await EventRegistrations.updateAsync(registration._id, { $set: { state, stateChangedAt: now, ...extra } });
  await recordChange({
    userId, domain: DOMAIN, action: state, docId: registration._id,
    before: registration, after: { ...registration, state, stateChangedAt: now, ...extra },
  });
};

/**
 * When a seat has been taken: an event waiting for its fewest participants
 * becomes confirmed once enough have one, and its hosts are told.
 */
const settleStatus = async (eventId) => {
  const { event, resolved } = await resolvedEvent(eventId);
  const status = statusFor({ event: resolved, seatsTaken: event.seatsTaken || 0, current: event.status });
  if (status !== event.status) {
    await Events.updateAsync(eventId, { $set: { status } });
    if (status === 'confirmed') await notify.eventConfirmed({ ...resolved, status });
  }
};

/** Seats freed at once (one withdrawal, or a deadline's missed check-ins): one message to the queue. */
const offerFreedSeats = async (eventId, freed) => {
  if (freed < 1) return;
  const queued = await EventRegistrations.find({ eventId, state: 'queued' }).fetchAsync();
  if (queued.length) {
    const { resolved } = await resolvedEvent(eventId);
    await notify.seatsFreed(resolved, queued, freed);
  }
};

/**
 * Sign a member up for an event: a seat when one is free and nobody queues,
 * else the queue when the event has one. A member signed up before and
 * withdrawn, or whose event was called off and on again, signs up anew.
 *
 * @param {{ info?: string, userId: string, override?: boolean }} options
 *   With `override` (board/admin adding someone) neither the certificate nor
 *   the information is asked for, and it may be after the start.
 * @returns {Promise<string>} the registration's state: approved, checkedIn or queued
 */
export const register = async (eventId, memberId, { info = '', userId, override = false, now = new Date() }) => {
  const { resolved } = await resolvedEvent(eventId);
  if (!takesRegistrations(resolved) || resolved.status === 'cancelled') {
    throw new Meteor.Error('closed', 'The event takes no registrations');
  }
  if (!override && !registrationOpen(resolved, now)) throw new Meteor.Error('closed', 'The event has started');
  const text = (info || '').trim();
  if (!override && resolved.infoRequired && !text) throw new Meteor.Error('info-required', 'The event asks for some information');
  if (!override && resolved.requiredCertificateId && !(await hasValidCertificate(memberId, resolved.requiredCertificateId, now))) {
    throw new Meteor.Error('certificate-required', 'The event asks for a certificate you do not hold');
  }
  const existing = await EventRegistrations.findOneAsync({ eventId, memberId });
  if (existing && [...PENDING, 'attended'].includes(existing.state)) {
    throw new Meteor.Error('registered', 'Already registered');
  }

  const queued = await EventRegistrations.find({ eventId, state: 'queued' }).countAsync();
  let state = registrationOutcome({ event: resolved, seatsTaken: resolved.seatsTaken || 0, queued });
  if (state === 'approved' && !(await takeSeatOf(resolved))) {
    state = resolved.queueAllowed ? 'queued' : 'full';
  }
  if (state === 'full') throw new Meteor.Error('full', 'The event is full');
  // So near the start that check-in has closed: taking the seat is the commitment.
  if (state === 'approved' && checkInClosed(resolved, now)) state = 'checkedIn';

  const fields = { state, stateChangedAt: now, registeredAt: now, ...(text ? { info: text } : {}) };
  let registrationId;
  if (existing) {
    registrationId = existing._id;
    await EventRegistrations.updateAsync(existing._id, { $set: fields, ...(text ? {} : { $unset: { info: '' } }) });
  } else {
    registrationId = await EventRegistrations.insertAsync({ eventId, memberId, ...fields });
  }
  await recordChange({ userId, domain: DOMAIN, action: 'register', docId: registrationId, before: existing || null, after: { eventId, memberId, ...fields } });
  if (HOLDING.includes(state)) await settleStatus(eventId);
  await notify.registered(resolved, { _id: registrationId, memberId, state });
  return state;
};

const registrationOf = async (eventId, memberId) => {
  const registration = await EventRegistrations.findOneAsync({ eventId, memberId });
  if (!registration) throw new Meteor.Error('not-found', 'Not registered');
  return registration;
};

/** Withdraw: the seat goes to the queue, which is told; a place in the queue just ends. */
export const withdraw = async (eventId, memberId, { userId, now = new Date(), override = false }) => {
  const { resolved } = await resolvedEvent(eventId);
  const registration = await registrationOf(eventId, memberId);
  if (!mayWithdraw(registration, resolved, now) && !(override && PENDING.includes(registration.state))) {
    throw new Meteor.Error('closed', 'It is too late to withdraw');
  }
  await setState(registration, 'withdrawn', { userId, now });
  if (HOLDING.includes(registration.state)) {
    await releaseSeats(eventId);
    await offerFreedSeats(eventId, 1);
  }
};

/**
 * A queued member takes a free seat: first come, first served. After the
 * check-in deadline the seat comes checked in: saying yes so near is the commitment.
 */
export const takeSeat = async (eventId, memberId, { userId, now = new Date() }) => {
  const { resolved } = await resolvedEvent(eventId);
  const registration = await registrationOf(eventId, memberId);
  if (!mayTakeSeat({ registration, event: resolved, seatsTaken: resolved.seatsTaken || 0, now })) {
    throw new Meteor.Error('taken', 'The seat has already been taken');
  }
  if (!(await takeSeatOf(resolved))) throw new Meteor.Error('taken', 'The seat has already been taken');
  const state = checkInClosed(resolved, now) ? 'checkedIn' : 'approved';
  const changed = await EventRegistrations.updateAsync(
    { _id: registration._id, state: 'queued' },
    { $set: { state, stateChangedAt: now } },
  );
  if (changed !== 1) {
    await releaseSeats(eventId);
    throw new Meteor.Error('taken', 'Not in the queue any more');
  }
  await recordChange({ userId, domain: DOMAIN, action: 'takeSeat', docId: registration._id, before: registration, after: { ...registration, state } });
  await settleStatus(eventId);
  return state;
};

/** Check in beforehand: a promise to come, within the window. */
export const checkIn = async (eventId, memberId, { userId, now = new Date() }) => {
  const { resolved } = await resolvedEvent(eventId);
  const registration = await registrationOf(eventId, memberId);
  if (!mayCheckIn(registration, resolved, now)) throw new Meteor.Error('closed', 'Check-in is not open');
  await setState(registration, 'checkedIn', { userId, now });
};

/** The event was called off: everyone with a seat or in the queue is told. */
export const cancelRegistrations = async (eventId, { now = new Date() } = {}) => {
  const pending = await EventRegistrations.find({ eventId, state: { $in: PENDING } }).fetchAsync();
  if (!pending.length) return;
  await EventRegistrations.updateAsync(
    { eventId, state: { $in: PENDING } },
    { $set: { state: 'cancelled', stateChangedAt: now } },
    { multi: true },
  );
  const held = pending.filter((r) => HOLDING.includes(r.state)).length;
  await releaseSeats(eventId, held);
  const { resolved } = await resolvedEvent(eventId);
  await notify.eventCancelled(resolved, pending);
};

/** A new event of an activity: those interested in the activity are told. */
export const announceNewEvent = async (eventId) => {
  const { event, resolved } = await resolvedEvent(eventId);
  if (!event.activityId || event.status === 'cancelled') return;
  const interested = await ActivityInterests.find({ activityId: event.activityId }).fetchAsync();
  if (interested.length) await notify.newEvent(resolved, interested.map((i) => i.memberId));
};

/** Show interest in an activity, or stop: whether one is interested now. */
export const setInterest = async (activityId, memberId, interested) => {
  if (!(await Activities.findOneAsync(activityId, { fields: { _id: 1 } }))) throw new Meteor.Error('not-found', 'No such activity');
  if (interested) {
    if (!(await ActivityInterests.findOneAsync({ activityId, memberId }))) {
      await ActivityInterests.insertAsync({ activityId, memberId, createdAt: new Date() });
    }
  } else {
    await ActivityInterests.removeAsync({ activityId, memberId });
  }
  return interested;
};

// --- Attendance (stage 3) -------------------------------------------------

/**
 * A host marks who came, or takes it back. One marked as not having come is
 * back where they were (with a seat); a no-show can be corrected to came.
 */
export const markAttended = async (eventId, memberId, attended, { userId, now = new Date() }) => {
  const { resolved } = await resolvedEvent(eventId);
  if (resolved.status === 'cancelled') throw new Meteor.Error('closed', 'The event was called off');
  if (now < resolved.start) throw new Meteor.Error('closed', 'Attendance is recorded from the start');
  const registration = await registrationOf(eventId, memberId);
  if (attended) {
    if (!['approved', 'checkedIn', 'noShow'].includes(registration.state)) {
      throw new Meteor.Error('bad-state', 'Only someone with a seat can have come');
    }
    // A no-show held no seat in the count any more; coming takes it back.
    if (registration.state === 'noShow') await Events.updateAsync(eventId, { $inc: { seatsTaken: 1 } });
    await setState(registration, 'attended', { userId, now });
  } else {
    if (registration.state !== 'attended') return;
    const state = resolved.attendanceClosedAt ? 'noShow' : 'approved';
    if (state === 'noShow') await releaseSeats(eventId);
    await setState(registration, state, { userId, now });
  }
};

/**
 * Close the attendance: whoever still holds a seat without having been
 * marked as come did not come. Only ever done by a host: forgetting to close
 * leaves everyone as they were rather than blaming them.
 */
export const closeAttendance = async (eventId, { userId, now = new Date() }) => {
  const { event, resolved } = await resolvedEvent(eventId);
  if (now < resolved.start) throw new Meteor.Error('closed', 'The event has not started');
  if (event.attendanceClosedAt) return 0;
  const stayed = await EventRegistrations.find({ eventId, state: { $in: ['approved', 'checkedIn'] } }).fetchAsync();
  for (const registration of stayed) await setState(registration, 'noShow', { userId, now });
  await releaseSeats(eventId, stayed.length);
  await Events.updateAsync(eventId, { $set: { attendanceClosedAt: now } });
  return stayed.length;
};

// --- Scheduled (stage 3) ---------------------------------------------------

/**
 * The events whose check-in has opened and whose seat holders have not been
 * reminded: each one with a seat is told, once per event.
 */
export const sendCheckInReminders = async (now = new Date()) => {
  let sent = 0;
  const events = await Events.find({ status: { $ne: 'cancelled' }, start: { $gt: now }, checkInReminderSentAt: { $exists: false } }).fetchAsync();
  for (const event of events) {
    const activity = event.activityId ? await Activities.findOneAsync(event.activityId) : null;
    const resolved = resolveEvent(event, activity);
    if (!checkInApplies(resolved) || now < checkInWindow(resolved).opens) continue;
    // Marked first, so that a failing send is not repeated every run.
    if ((await Events.updateAsync({ _id: event._id, checkInReminderSentAt: { $exists: false } }, { $set: { checkInReminderSentAt: now } })) !== 1) continue;
    const approved = await EventRegistrations.find({ eventId: event._id, state: 'approved' }).fetchAsync();
    if (approved.length) await notify.checkInOpen(resolved, approved);
    sent += approved.length;
  }
  return sent;
};

/**
 * The events whose check-in deadline has passed: who has a seat and did not
 * check in loses it (missedCheckIn), and the queue is offered the seats in
 * one message. Once per event.
 */
export const passCheckInDeadlines = async (now = new Date()) => {
  let missed = 0;
  const events = await Events.find({ status: { $ne: 'cancelled' }, checkInDeadlinePassedAt: { $exists: false }, start: { $gt: new Date(now.getTime() - 7 * 86400000) } }).fetchAsync();
  for (const event of events) {
    const activity = event.activityId ? await Activities.findOneAsync(event.activityId) : null;
    const resolved = resolveEvent(event, activity);
    if (!checkInApplies(resolved) || now < checkInWindow(resolved).closes) continue;
    if ((await Events.updateAsync({ _id: event._id, checkInDeadlinePassedAt: { $exists: false } }, { $set: { checkInDeadlinePassedAt: now } })) !== 1) continue;
    const late = await EventRegistrations.find({ eventId: event._id, state: 'approved' }).fetchAsync();
    for (const registration of late) await setState(registration, 'missedCheckIn', { userId: null, now });
    await releaseSeats(event._id, late.length);
    if (late.length) await notify.missedCheckIn(resolved, late);
    if (resolved.start > now) await offerFreedSeats(event._id, late.length);
    missed += late.length;
  }
  return missed;
};

/** How many seats an event has left; Infinity without a limit. */
export const seatsLeftOf = (resolved) => seatsLeft(resolved, resolved.seatsTaken || 0);
