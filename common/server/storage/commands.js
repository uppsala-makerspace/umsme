import { Meteor } from 'meteor/meteor';
import { Members } from '/imports/common/collections/members';
import { Messages } from '/imports/common/collections/messages';
import {
  StorageUnits, StorageRequests, StorageOffers, StorageEvents,
} from '/imports/common/collections/storage';
import {
  hasActiveLabMembershipAt, isStorageExemptionActive,
  storageOfferDeadline, storageWarningDeadline,
} from '/imports/common/lib/storageRules';
import { runStorageAtomic } from './atomic';
import { STORAGE_SCHEMAS, casStorageUpdate, insertStorageDocument } from './db';
import { appendStorageEvent } from './events';
import { isDuplicateKeyError, StorageConflictError } from './errors';
import { sendStorageNotification, storageMessageRecordId } from '../storageMessages/service';
import { previewStorageSuggestions } from './suggestions';
import { reconcileStorageState } from './reconciliation';
import { storageAllocationReadiness } from './readiness';
import { storageOperationId } from './ids';

const canonicalSelections = (selections) => [...selections]
  .sort((a, b) => String(a.suggestion_id).localeCompare(String(b.suggestion_id)));
const ensure = (condition, message) => {
  if (!condition) throw new StorageConflictError(message);
};
const removeOffer = async (offer, session) => {
  if (session) {
    const result = await StorageOffers.rawCollection().deleteOne({ _id: offer._id, updatedAt: offer.updatedAt }, { session });
    if (result.deletedCount !== 1) throw new StorageConflictError();
    return;
  }
  const removed = await StorageOffers.removeAsync({ _id: offer._id, updatedAt: offer.updatedAt });
  if (removed !== 1) throw new StorageConflictError();
};

const recordsFor = async (row) => {
  const [owner, unit, sourceUnit, request, offer] = await Promise.all([
    row.owner ? Members.findOneAsync(row.owner) : null,
    row.unit ? StorageUnits.findOneAsync(row.unit) : null,
    row.source_unit ? StorageUnits.findOneAsync(row.source_unit) : null,
    row.request ? StorageRequests.findOneAsync(row.request) : null,
    row.offer ? StorageOffers.findOneAsync(row.offer) : null,
  ]);
  return { owner, unit, sourceUnit, request, offer };
};

const storageEvent = (input, session) => appendStorageEvent(input, { session });

const applyAssignment = async ({ owner, unit, request }, actor, now, session, eventId) => {
  ensure(owner && unit && request, 'Assignment state is missing');
  ensure(hasActiveLabMembershipAt(owner, now), 'Lab membership is no longer active');
  await casStorageUpdate(StorageUnits,
    { _id: unit._id, availability_status: 'available', owner: { $exists: false }, updatedAt: unit.updatedAt },
    { $set: {
      availability_status: 'occupied', owner: owner._id, assigned_at: now,
      assigned_by: actor, source_request: request._id, updatedAt: now,
    } }, { session });
  await casStorageUpdate(StorageRequests,
    { _id: request._id, request_status: 'waiting', updatedAt: request.updatedAt },
    { $set: { request_status: 'fulfilled', fulfilled_at: now, updatedAt: now } }, { session });
  // Sent inside the transaction on purpose: the Messages id is deterministic
  // per decision, so a retry after an aborted commit is deduplicated, and a
  // member is never left unnotified by a crash between commit and send. The
  // price is a premature message if this transaction is rolled back.
  const messageId = await sendStorageNotification({
    owner, decisionType: 'assignment', decisionId: unit._id, now,
    context: { owner_name: owner.name, unit_name: unit.name },
  });
  await storageEvent({
    id: eventId, entityType: 'storageUnit', entityId: unit._id, eventType: 'unit_assigned',
    actorType: 'administrator', actor, member: owner._id, unit: unit._id, occurredAt: now,
    details: { request: request._id, message_id: messageId },
  }, session);
  return { decision_id: unit._id, message_id: messageId };
};

const reserveMove = async ({ owner, unit, sourceUnit, request }, selection, actor, now, session, eventId) => {
  ensure(owner && unit && sourceUnit && request, 'Move state is missing');
  ensure(sourceUnit.availability_status === 'occupied' && sourceUnit.owner === owner._id, 'Move source changed');
  ensure(hasActiveLabMembershipAt(owner, now), 'Lab membership is no longer active');
  const offerId = `${eventId}:offer`;
  const deadline = storageOfferDeadline(now);
  await casStorageUpdate(StorageUnits,
    { _id: unit._id, availability_status: 'available', owner: { $exists: false }, updatedAt: unit.updatedAt },
    { $set: { availability_status: 'reserved', owner: owner._id, updatedAt: now } }, { session });
  await casStorageUpdate(StorageRequests,
    { _id: request._id, request_status: 'waiting', updatedAt: request.updatedAt },
    { $set: { request_status: 'in_progress', updatedAt: now } }, { session });
  await insertStorageDocument(StorageOffers, STORAGE_SCHEMAS.offer, {
    _id: offerId, owner: owner._id, request: request._id,
    from_unit: sourceUnit._id, to_unit: unit._id, offered_at: now, offered_by: actor,
    deadline_at: deadline, requires_inspection: selection.requires_inspection === true,
    createdAt: now, updatedAt: now,
  }, { session });
  const messageId = await sendStorageNotification({
    owner, decisionType: 'move', decisionId: offerId, now,
    context: { owner_name: owner.name, unit_name: unit.name, from_unit: sourceUnit._id, deadline_at: deadline },
  });
  await storageEvent({
    id: eventId, entityType: 'storageOffer', entityId: offerId, eventType: 'offer_created',
    actorType: 'administrator', actor, member: owner._id, unit: unit._id,
    relatedUnit: sourceUnit._id, occurredAt: now,
    details: { request: request._id, requires_inspection: selection.requires_inspection === true, message_id: messageId },
  }, session);
  return { decision_id: offerId, message_id: messageId };
};

const applyWarning = async ({ owner, unit }, actor, now, session, eventId) => {
  ensure(owner && unit?.availability_status === 'occupied', 'Warning state is missing');
  ensure(!hasActiveLabMembershipAt(owner, now), 'Lab membership was renewed');
  ensure(!unit.warning, 'Member has already been warned');
  ensure(!isStorageExemptionActive(unit.exemption, now), 'Assignment is exempt');
  const warningId = `${eventId}:warning`;
  const warning = {
    id: warningId, warned_at: now, warned_by: actor, deadline_at: storageWarningDeadline(now),
  };
  await casStorageUpdate(StorageUnits,
    { _id: unit._id, availability_status: 'occupied', owner: owner._id, warning: { $exists: false }, updatedAt: unit.updatedAt },
    { $set: { warning, updatedAt: now } }, { session });
  const messageId = await sendStorageNotification({
    owner, decisionType: 'warning', decisionId: warningId, now,
    context: { owner_name: owner.name, deadline_at: warning.deadline_at },
  });
  await casStorageUpdate(StorageUnits,
    { _id: unit._id, 'warning.id': warningId, updatedAt: now },
    { $set: { 'warning.message_id': messageId } }, { session });
  await storageEvent({
    id: eventId, entityType: 'storageUnit', entityId: unit._id, eventType: 'warning_created',
    actorType: 'administrator', actor, member: owner._id, unit: unit._id, occurredAt: now,
    details: { warning_id: warningId, deadline_at: warning.deadline_at, message_id: messageId },
  }, session);
  return { decision_id: warningId, message_id: messageId };
};

const applyReminder = async ({ owner, unit }, actor, now, session, eventId) => {
  const warning = unit?.warning;
  ensure(owner && unit?.availability_status === 'occupied' && warning, 'Reminder state is missing');
  ensure(!hasActiveLabMembershipAt(owner, now), 'Lab membership was renewed');
  ensure(!isStorageExemptionActive(unit.exemption, now), 'Assignment is exempt');
  ensure(!warning.reminded_at, 'Reminder was already sent');
  await casStorageUpdate(StorageUnits,
    { _id: unit._id, 'warning.id': warning.id, 'warning.reminded_at': { $exists: false }, updatedAt: unit.updatedAt },
    { $set: { 'warning.reminded_at': now, updatedAt: now } }, { session });
  const messageId = await sendStorageNotification({
    owner, decisionType: 'reminder', decisionId: warning.id, now,
    context: { owner_name: owner.name, deadline_at: warning.deadline_at },
  });
  await storageEvent({
    id: eventId, entityType: 'storageUnit', entityId: unit._id, eventType: 'reminder_confirmed',
    actorType: 'administrator', actor, member: owner._id, unit: unit._id,
    occurredAt: now, details: { warning_id: warning.id, message_id: messageId },
  }, session);
  return { decision_id: warning.id, message_id: messageId };
};

const endForClearance = async ({ owner, unit, request }, selection, actor, now, session, eventId, reason) => {
  ensure(owner && unit?.availability_status === 'occupied' && unit.owner === owner._id, 'Assignment state is missing');
  let warningContact;
  let manualReason;
  if (reason === 'reclaimed') {
    ensure(unit.warning, 'Open warning state is missing');
    ensure(!isStorageExemptionActive(unit.exemption, now), 'Assignment is exempt');
    const delivered = await Messages.findOneAsync(storageMessageRecordId('warning', unit.warning.id));
    if (delivered) warningContact = 'notification_delivered';
    else {
      manualReason = String(selection.manual_contact_reason || '').trim();
      ensure(selection.manual_contact_confirmed === true && manualReason, 'Confirm manual contact and give a reason');
      warningContact = 'manual_contact_confirmed';
    }
  }
  await casStorageUpdate(StorageUnits,
    { _id: unit._id, availability_status: 'occupied', owner: owner._id, updatedAt: unit.updatedAt },
    { $set: { availability_status: 'awaiting_clearance', updatedAt: now }, $unset: { warning: '', exemption: '' } },
    { session });
  if (request) {
    await casStorageUpdate(StorageRequests,
      { _id: request._id, request_status: 'waiting', updatedAt: request.updatedAt },
      { $set: { request_status: 'fulfilled', fulfilled_at: now, updatedAt: now } }, { session });
  }
  const decisionType = reason === 'reclaimed' ? 'reclamation' : 'voluntary_release';
  const messageId = await sendStorageNotification({
    owner, decisionType, decisionId: unit._id, now,
    context: { owner_name: owner.name, unit_name: unit.name },
  });
  await storageEvent({
    id: eventId, entityType: 'storageUnit', entityId: unit._id, eventType: 'unit_marked_returned',
    actorType: 'administrator', actor, member: owner._id, unit: unit._id,
    occurredAt: now, reason: manualReason || undefined,
    details: { reason, warning_contact: warningContact, message_id: messageId },
  }, session);
  return { decision_id: unit._id, message_id: messageId };
};

const clearUnit = async ({ unit }, actor, now, session, eventId) => {
  ensure(unit?.availability_status === 'awaiting_clearance', 'Unit is no longer awaiting clearance');
  await casStorageUpdate(StorageUnits, { _id: unit._id, availability_status: 'awaiting_clearance', updatedAt: unit.updatedAt }, {
    $set: { availability_status: 'available', updatedAt: now },
    $unset: {
      owner: '', assigned_at: '', assigned_by: '', source_request: '', warning: '', exemption: '',
    },
  }, { session });
  await storageEvent({
    id: eventId, entityType: 'storageUnit', entityId: unit._id, eventType: 'physical_clearance_confirmed',
    actorType: 'administrator', actor, member: unit.owner, unit: unit._id, occurredAt: now,
  }, session);
  return { decision_id: unit._id };
};

const finishMove = async (offer, actor, actorType, now, session, eventId) => {
  const [owner, source, destination, request] = await Promise.all([
    Members.findOneAsync(offer.owner), StorageUnits.findOneAsync(offer.from_unit),
    StorageUnits.findOneAsync(offer.to_unit), StorageRequests.findOneAsync(offer.request),
  ]);
  ensure(owner && source && destination && request, 'Move references are missing');
  ensure(source.availability_status === 'occupied' && source.owner === owner._id, 'Move source changed');
  ensure(destination.availability_status === 'reserved' && destination.owner === owner._id, 'Move destination changed');
  const sourceModifier = offer.requires_inspection
    ? { $set: { availability_status: 'awaiting_clearance', updatedAt: now }, $unset: { warning: '', exemption: '' } }
    : { $set: { availability_status: 'available', updatedAt: now }, $unset: {
      owner: '', assigned_at: '', assigned_by: '', source_request: '', warning: '', exemption: '',
    } };
  await casStorageUpdate(StorageUnits,
    { _id: source._id, availability_status: 'occupied', owner: owner._id, updatedAt: source.updatedAt },
    sourceModifier, { session });
  await casStorageUpdate(StorageUnits,
    { _id: destination._id, availability_status: 'reserved', owner: owner._id, updatedAt: destination.updatedAt },
    { $set: {
      availability_status: 'occupied', assigned_at: now, assigned_by: actor,
      source_request: request._id,
      ...(source.warning ? { warning: source.warning } : {}),
      ...(source.exemption ? { exemption: source.exemption } : {}),
      updatedAt: now,
    } }, { session });
  await casStorageUpdate(StorageRequests,
    { _id: request._id, request_status: 'in_progress', updatedAt: request.updatedAt },
    { $set: { request_status: 'fulfilled', fulfilled_at: now, updatedAt: now } }, { session });
  await removeOffer(offer, session);
  await storageEvent({
    id: eventId, entityType: 'storageOffer', entityId: offer._id, eventType: 'offer_completed',
    actorType, actor, member: owner._id, unit: destination._id, relatedUnit: source._id,
    occurredAt: now, details: { requires_inspection: offer.requires_inspection },
  }, session);
  return { decision_id: offer._id, unit_id: destination._id };
};

const reviewOffer = async (records, selection, actor, now, session, eventId) => {
  const { offer, owner, unit, request } = records;
  ensure(offer && owner, 'Move is no longer pending');
  if (selection.resolution === 'complete') return finishMove(offer, actor, 'administrator', now, session, eventId);
  if (selection.resolution === 'extend') {
    const deadline = new Date(selection.extend_to);
    if (Number.isNaN(deadline.getTime()) || deadline <= now) throw new Meteor.Error('bad-date', 'Move extension must be in the future');
    await casStorageUpdate(StorageOffers, { _id: offer._id, updatedAt: offer.updatedAt },
      { $set: { deadline_at: deadline, updatedAt: now } }, { session });
    await storageEvent({
      id: eventId, entityType: 'storageOffer', entityId: offer._id, eventType: 'offer_extended',
      actorType: 'administrator', actor, member: owner._id, unit: offer.to_unit,
      relatedUnit: offer.from_unit, occurredAt: now, details: { deadline_at: deadline },
    }, session);
    return { decision_id: offer._id };
  }
  if (selection.resolution === 'cancel') {
    ensure(unit && request, 'Move references are missing');
    await casStorageUpdate(StorageUnits,
      { _id: unit._id, availability_status: 'reserved', owner: owner._id, updatedAt: unit.updatedAt },
      { $set: { availability_status: 'available', updatedAt: now }, $unset: { owner: '' } }, { session });
    await casStorageUpdate(StorageRequests,
      { _id: request._id, request_status: 'in_progress', updatedAt: request.updatedAt },
      selection.cancel_request === true
        ? { $set: { request_status: 'cancelled', cancelled_at: now, updatedAt: now } }
        : { $set: { request_status: 'waiting', updatedAt: now }, $unset: { cancelled_at: '', fulfilled_at: '' } },
      { session });
    await removeOffer(offer, session);
    await storageEvent({
      id: eventId, entityType: 'storageOffer', entityId: offer._id, eventType: 'offer_cancelled',
      actorType: 'administrator', actor, member: owner._id, unit: offer.to_unit,
      relatedUnit: offer.from_unit, occurredAt: now, reason: selection.reason,
      details: { request_returned_to_queue: selection.cancel_request !== true },
    }, session);
    return { decision_id: offer._id };
  }
  throw new Meteor.Error('bad-resolution', 'Choose complete, extend, or cancel');
};

const applySuggestedAction = async (action, records, selection, actor, now, session, eventId, row) => {
  if (action === 'allocate') {
    return row.decision_type === 'move'
      ? reserveMove(records, selection, actor, now, session, eventId)
      : applyAssignment(records, actor, now, session, eventId);
  }
  if (action === 'warn') return applyWarning(records, actor, now, session, eventId);
  if (action === 'remind') return applyReminder(records, actor, now, session, eventId);
  if (action === 'reclaim') return endForClearance(records, selection, actor, now, session, eventId, 'reclaimed');
  if (action === 'release') return endForClearance(records, selection, actor, now, session, eventId, 'voluntary_release');
  if (action === 'review_expired_offers') return reviewOffer(records, selection, actor, now, session, eventId);
  if (action === 'confirm_clearance') return clearUnit(records, actor, now, session, eventId);
  throw new Meteor.Error('bad-action', 'Unknown storage action');
};

const executeRow = async ({ action, commandId, selection, row, actor }) => {
  const eventId = storageOperationId('suggested', actor, action, commandId, row.suggestion_id);
  const prior = await StorageEvents.findOneAsync(eventId);
  if (prior) return { suggestion_id: row.suggestion_id, status: 'already_applied', ...(prior.details?.result || {}) };
  if (action === 'allocate' && !(await storageAllocationReadiness()).allocation_ready) {
    return { suggestion_id: row.suggestion_id, status: 'stale', reason: 'Storage allocation readiness changed' };
  }
  const records = await recordsFor(row);
  const now = new Date();
  try {
    const result = await runStorageAtomic({
      transactional: (session) => applySuggestedAction(action, records, selection, actor, now, session, eventId, row),
    });
    return { suggestion_id: row.suggestion_id, status: 'applied', ...result };
  } catch (error) {
    const status = error instanceof StorageConflictError || isDuplicateKeyError(error) ? 'conflict' : 'failed';
    return { suggestion_id: row.suggestion_id, status, reason: error.message };
  }
};

export const confirmStorageSuggestions = async ({ action, commandId, selections, actor }) => {
  if (!commandId || typeof commandId !== 'string') throw new Meteor.Error('bad-command', 'command_id is required');
  if (!Array.isArray(selections) || selections.length === 0) throw new Meteor.Error('bad-selection', 'Select at least one suggested action');
  const normalized = canonicalSelections(selections);
  if (new Set(normalized.map((item) => item.suggestion_id)).size !== normalized.length) {
    throw new Meteor.Error('bad-selection', 'A suggestion may only appear once in a command');
  }
  await reconcileStorageState();
  const preview = await previewStorageSuggestions(action);
  const currentById = new Map(preview.rows.map((item) => [item.suggestion_id, item]));
  const results = [];
  for (const selection of normalized) {
    const eventId = storageOperationId('suggested', actor, action, commandId, selection.suggestion_id);
    const prior = await StorageEvents.findOneAsync(eventId);
    const current = currentById.get(selection.suggestion_id);
    if (!current) {
      results.push(prior
        ? { suggestion_id: selection.suggestion_id, status: 'already_applied', ...(prior.details?.result || {}) }
        : { suggestion_id: selection.suggestion_id, status: 'stale' });
      continue;
    }
    results.push(await executeRow({ action, commandId, selection, row: current, actor }));
  }
  return { command_id: commandId, results };
};

export const completeStorageOffer = async ({ offerId, actor, actorType }) => {
  const eventId = storageOperationId('offer.complete', actorType, actor, offerId);
  const prior = await StorageEvents.findOneAsync(eventId);
  if (prior) return { decision_id: offerId, unit_id: prior.unit };
  const offer = await StorageOffers.findOneAsync(offerId);
  if (!offer) throw new Meteor.Error('not-found', 'Offer not found');
  const now = new Date();
  await reconcileStorageState({ ownerIds: [offer.owner], now });
  return runStorageAtomic({
    transactional: (session) => finishMove(offer, actor, actorType, now, session, eventId),
  });
};
