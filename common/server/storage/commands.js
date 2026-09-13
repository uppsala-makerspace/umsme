import crypto from 'node:crypto';
import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import { Members } from '/imports/common/collections/members';
import { Messages } from '/imports/common/collections/messages';
import {
  StorageUnits,
  StorageRequests,
  StorageAssignments,
  StorageWarnings,
  StorageExemptions,
  StorageMoves,
  StorageActionExecutions,
} from '/imports/common/collections/storage';
import {
  hasActiveLabMembershipAt,
  isStorageExemptionActive,
  storageMoveDeadline,
  storageWarningDeadline,
} from '/imports/common/lib/storageRules';
import { runStorageAtomic } from './atomic';
import { STORAGE_SCHEMAS, casStorageUpdate, insertStorageDocument } from './db';
import { appendStorageEvent } from './events';
import { isDuplicateKeyError, StorageConflictError } from './errors';
import { sendStorageNotification, storageMessageRecordId } from '../storageMessages/service';
import { previewStorageSuggestions } from './suggestions';
import { reconcileStorageState } from './reconciliation';
import { storageAllocationReadiness } from './readiness';
import { ensureStorageDocument, ensureStorageUpdate } from './effects';
import { journaledStorageOperation, storageOperationId } from './journal';

const receiptId = (actor, action, commandId, suggestionId) => crypto.createHash('sha256')
  .update(`${actor}:${action}:${commandId}:${suggestionId}`).digest('hex').slice(0, 32);
const batchId = (actor, action, commandId) => storageOperationId('suggested.batch', actor, action, commandId);
const canonicalSelections = (selections) => [...selections]
  .sort((a, b) => String(a.suggestion_id).localeCompare(String(b.suggestion_id)));

const fetchById = async (collection, id) => id ? collection.findOneAsync(id) : null;
const ensure = (condition, message) => {
  if (!condition) throw new StorageConflictError(message);
};

const event = (entityType, entityId, eventType, actor, now, details, session, reason, id) =>
  appendStorageEvent({
    id,
    entityType,
    entityId,
    eventType,
    actorType: 'administrator',
    actor,
    occurredAt: now,
    details,
    reason,
  }, { session });

const runStep = (journal, name, work) => journal ? journal.step(name, work) : work();
const sameDate = (a, b) => a instanceof Date && b instanceof Date && a.getTime() === b.getTime();

const loadRowRecords = async (row) => {
  const [owner, unit, request, assignment, warning, move] = await Promise.all([
    fetchById(Members, row.owner),
    fetchById(StorageUnits, row.unit),
    fetchById(StorageRequests, row.request),
    fetchById(StorageAssignments, row.assignment),
    fetchById(StorageWarnings, row.warning),
    fetchById(StorageMoves, row.move),
  ]);
  return { owner, unit, request, assignment, warning, move };
};

const applyAssignment = async (records, actor, now, session, journal, ids = {}) => {
  const { owner, unit, request } = records;
  ensure(owner && unit && request, 'Assignment state is missing');
  ensure(hasActiveLabMembershipAt(owner, now), 'Lab membership is no longer active');
  const assignmentId = ids.decision || Random.id();
  await runStep(journal, 'unit_occupied', () => ensureStorageUpdate(StorageUnits, unit._id,
    { availability_status: 'available', owner: { $exists: false }, updatedAt: unit.updatedAt },
    { $set: { availability_status: 'occupied', owner: owner._id, updatedAt: now } },
    (current) => current.availability_status === 'occupied' && current.owner === owner._id && sameDate(current.updatedAt, now),
    { session }));
  await runStep(journal, 'request_fulfilled', () => ensureStorageUpdate(StorageRequests, request._id,
    { request_status: 'waiting', updatedAt: request.updatedAt },
    { $set: { request_status: 'fulfilled', fulfilled_at: now, updatedAt: now } },
    (current) => current.request_status === 'fulfilled' && sameDate(current.fulfilled_at, now),
    { session }));
  await runStep(journal, 'assignment_inserted', () => ensureStorageDocument(StorageAssignments, STORAGE_SCHEMAS.assignment, {
    _id: assignmentId,
    unit: unit._id,
    owner: owner._id,
    request: request._id,
    assigned_at: now,
    assigned_by: actor,
    createdAt: now,
    updatedAt: now,
  }, { session, matches: (current) => current.unit === unit._id && current.owner === owner._id }));
  await runStep(journal, 'event_inserted', () => event('storageAssignment', assignmentId, 'assignment_created', actor, now,
    { unit: unit._id, owner: owner._id, request: request._id }, session, undefined, ids.event));
  let messageId = storageMessageRecordId('assignment', assignmentId);
  await runStep(journal, 'message_sent', async () => {
    messageId = await sendStorageNotification({
      owner, decisionType: 'assignment', decisionId: assignmentId, now,
      context: { owner_name: owner.name, unit_name: unit.name },
    });
  });
  return { decision_id: assignmentId, message_id: messageId };
};

const reserveMove = async (records, actor, now, session, { requiresInspection = false } = {}, journal, ids = {}) => {
  const { owner, unit, request, assignment } = records;
  ensure(owner && unit && request && assignment && !assignment.ended_at, 'Move state is missing');
  ensure(hasActiveLabMembershipAt(owner, now), 'Lab membership is no longer active');
  const moveId = ids.decision || Random.id();
  await runStep(journal, 'assignment_claimed', () => ensureStorageUpdate(StorageAssignments, assignment._id,
    { ended_at: { $exists: false }, updatedAt: assignment.updatedAt },
    { $set: { updatedAt: now } },
    (current) => !current.ended_at && sameDate(current.updatedAt, now), { session }));
  await runStep(journal, 'unit_reserved', () => ensureStorageUpdate(StorageUnits, unit._id,
    { availability_status: 'available', owner: { $exists: false }, updatedAt: unit.updatedAt },
    { $set: { availability_status: 'reserved', owner: owner._id, updatedAt: now } },
    (current) => current.availability_status === 'reserved' && current.owner === owner._id && sameDate(current.updatedAt, now),
    { session }));
  await runStep(journal, 'request_in_progress', () => ensureStorageUpdate(StorageRequests, request._id,
    { request_status: 'waiting', updatedAt: request.updatedAt },
    { $set: { request_status: 'in_progress', updatedAt: now } },
    (current) => current.request_status === 'in_progress' && sameDate(current.updatedAt, now), { session }));
  await runStep(journal, 'move_inserted', () => ensureStorageDocument(StorageMoves, STORAGE_SCHEMAS.move, {
    _id: moveId,
    owner: owner._id,
    request: request._id,
    from_assignment: assignment._id,
    from_unit: assignment.unit,
    to_unit: unit._id,
    reserved_at: now,
    reserved_by: actor,
    deadline_at: storageMoveDeadline(now),
    requires_inspection: requiresInspection,
    move_status: 'pending',
    createdAt: now,
    updatedAt: now,
  }, { session, matches: (current) => current.owner === owner._id && current.to_unit === unit._id }));
  await runStep(journal, 'event_inserted', () => event('storageMove', moveId, 'move_reserved', actor, now,
    {
      from_unit: assignment.unit,
      to_unit: unit._id,
      owner: owner._id,
      requires_inspection: requiresInspection,
    }, session, undefined, ids.event));
  let messageId = storageMessageRecordId('move', moveId);
  await runStep(journal, 'message_sent', async () => {
    messageId = await sendStorageNotification({
      owner, decisionType: 'move', decisionId: moveId, now,
      context: {
        owner_name: owner.name, unit_name: unit.name,
        from_unit: assignment.unit, deadline_at: storageMoveDeadline(now),
      },
    });
  });
  return { decision_id: moveId, message_id: messageId };
};

const applyWarning = async (records, actor, now, session, journal, ids = {}) => {
  const { owner, assignment } = records;
  ensure(owner && assignment && !assignment.ended_at, 'Warning state is missing');
  ensure(!hasActiveLabMembershipAt(owner, now), 'Lab membership was renewed');
  const exemption = await StorageExemptions.findOneAsync({ assignment: assignment._id, active: true });
  ensure(!isStorageExemptionActive(exemption, now), 'Assignment is exempt');
  const warningId = ids.decision || Random.id();
  await runStep(journal, 'assignment_claimed', () => ensureStorageUpdate(StorageAssignments, assignment._id,
    { ended_at: { $exists: false }, updatedAt: assignment.updatedAt },
    { $set: { updatedAt: now } },
    (current) => !current.ended_at && sameDate(current.updatedAt, now), { session }));
  await runStep(journal, 'warning_inserted', () => ensureStorageDocument(StorageWarnings, STORAGE_SCHEMAS.warning, {
    _id: warningId,
    assignment: assignment._id,
    owner: owner._id,
    warned_at: now,
    warned_by: actor,
    deadline_at: storageWarningDeadline(now),
    warning_status: 'open',
    createdAt: now,
    updatedAt: now,
  }, { session, matches: (current) => current.assignment === assignment._id && current.owner === owner._id }));
  await runStep(journal, 'event_inserted', () => event('storageWarning', warningId, 'warning_created', actor, now,
    { assignment: assignment._id, deadline_at: storageWarningDeadline(now) }, session, undefined, ids.event));
  let messageId = storageMessageRecordId('warning', warningId);
  await runStep(journal, 'message_sent', async () => {
    messageId = await sendStorageNotification({
      owner, decisionType: 'warning', decisionId: warningId, now,
      context: { owner_name: owner.name, deadline_at: storageWarningDeadline(now) },
    });
  });
  return { decision_id: warningId, message_id: messageId };
};

const applyReminder = async (records, actor, now, session, journal, ids = {}) => {
  const { owner, warning } = records;
  ensure(owner && warning?.warning_status === 'open', 'Reminder state is missing');
  ensure(!hasActiveLabMembershipAt(owner, now), 'Lab membership was renewed');
  const assignment = await StorageAssignments.findOneAsync(warning.assignment);
  const exemption = await StorageExemptions.findOneAsync({ assignment: warning.assignment, active: true });
  ensure(assignment && !assignment.ended_at, 'Assignment is no longer active');
  ensure(!isStorageExemptionActive(exemption, now), 'Assignment is exempt');
  await runStep(journal, 'warning_claimed', () => ensureStorageUpdate(StorageWarnings, warning._id,
    { warning_status: 'open', updatedAt: warning.updatedAt }, { $set: { updatedAt: now } },
    (current) => current.warning_status === 'open' && sameDate(current.updatedAt, now), { session }));
  await runStep(journal, 'assignment_claimed', () => ensureStorageUpdate(StorageAssignments, assignment._id,
    { ended_at: { $exists: false }, updatedAt: assignment.updatedAt }, { $set: { updatedAt: now } },
    (current) => !current.ended_at && sameDate(current.updatedAt, now), { session }));
  await runStep(journal, 'event_inserted', () => event('storageWarning', warning._id, 'reminder_confirmed', actor, now,
    { assignment: warning.assignment }, session, undefined, ids.event));
  let messageId = storageMessageRecordId('reminder', warning._id);
  await runStep(journal, 'message_sent', async () => {
    messageId = await sendStorageNotification({
      owner, decisionType: 'reminder', decisionId: warning._id, now,
      context: { owner_name: owner.name, deadline_at: warning.deadline_at },
    });
  });
  return { decision_id: warning._id, message_id: messageId };
};

const endForClearance = async ({
  records, actor, now, reason, request, warning, contactConfirmation, session, journal, ids = {},
}) => {
  const { owner, unit, assignment } = records;
  ensure(owner && unit && assignment && !assignment.ended_at, 'Assignment state is missing');
  const exemption = await StorageExemptions.findOneAsync({ assignment: assignment._id, active: true });
  if (reason === 'reclaimed') ensure(!isStorageExemptionActive(exemption, now), 'Assignment is exempt');
  let warningContact;
  let manualContactReason;
  if (reason === 'reclaimed') {
    ensure(warning?.warning_status === 'open' && warning.assignment === assignment._id,
      'Open warning state is missing');
    const warningMessage = await Messages.findOneAsync(storageMessageRecordId('warning', warning?._id));
    if (warningMessage) {
      warningContact = 'notification_delivered';
    } else {
      manualContactReason = typeof contactConfirmation?.reason === 'string'
        ? contactConfirmation.reason.trim()
        : '';
      ensure(manualContactReason.length <= 5000, 'Manual contact reason is too long');
      ensure(contactConfirmation?.confirmed === true && manualContactReason.length > 0,
        'Reclamation requires a delivered warning or confirmed manual contact with a reason');
      warningContact = 'manual_contact_confirmed';
    }
  }
  await runStep(journal, 'assignment_ended', () => ensureStorageUpdate(StorageAssignments, assignment._id,
    { ended_at: { $exists: false }, updatedAt: assignment.updatedAt },
    { $set: { ended_at: now, ended_by: actor, ended_reason: reason, updatedAt: now } },
    (current) => current.ended_reason === reason && sameDate(current.ended_at, now), { session }));
  await runStep(journal, 'unit_awaiting_clearance', () => ensureStorageUpdate(StorageUnits, unit._id,
    { availability_status: 'occupied', owner: owner._id, updatedAt: unit.updatedAt },
    { $set: { availability_status: 'awaiting_clearance', updatedAt: now } },
    (current) => current.availability_status === 'awaiting_clearance' && current.owner === owner._id && sameDate(current.updatedAt, now),
    { session }));
  if (request) {
    await runStep(journal, 'request_fulfilled', () => ensureStorageUpdate(StorageRequests, request._id,
      { request_status: 'waiting', updatedAt: request.updatedAt },
      { $set: { request_status: 'fulfilled', fulfilled_at: now, updatedAt: now } },
      (current) => current.request_status === 'fulfilled' && sameDate(current.fulfilled_at, now), { session }));
  }
  if (warning) {
    await runStep(journal, 'warning_resolved', () => ensureStorageUpdate(StorageWarnings, warning._id,
      { warning_status: 'open', updatedAt: warning.updatedAt },
      { $set: { warning_status: 'resolved_reclamation', resolved_at: now, resolved_by: actor, updatedAt: now } },
      (current) => current.warning_status === 'resolved_reclamation' && sameDate(current.resolved_at, now),
      { session }));
  }
  await runStep(journal, 'event_inserted', () => event('storageAssignment', assignment._id, 'assignment_ended', actor, now,
    {
      unit: unit._id, owner: owner._id, reason,
      ...(warningContact ? { warning_contact: warningContact } : {}),
    }, session, manualContactReason || undefined, ids.event));
  const decisionType = reason === 'reclaimed' ? 'reclamation' : 'voluntary_release';
  let messageId = storageMessageRecordId(decisionType, assignment._id);
  await runStep(journal, 'message_sent', async () => {
    messageId = await sendStorageNotification({
      owner, decisionType, decisionId: assignment._id, now,
      context: { owner_name: owner.name, unit_name: unit.name },
    });
  });
  return { decision_id: assignment._id, message_id: messageId };
};

const completeMove = async (records, actor, actorType, now, session, journal, ids = {}) => {
  const { owner, move } = records;
  ensure(owner && move?.move_status === 'pending', 'Move is no longer pending');
  const [source, destination, assignment, request] = await Promise.all([
    StorageUnits.findOneAsync(move.from_unit),
    StorageUnits.findOneAsync(move.to_unit),
    StorageAssignments.findOneAsync(move.from_assignment),
    StorageRequests.findOneAsync(move.request),
  ]);
  ensure(source && destination && assignment && request, 'Move references are missing');
  const newAssignmentId = ids.assignment || Random.id();
  await runStep(journal, 'old_assignment_ended', () => ensureStorageUpdate(StorageAssignments, assignment._id,
    { ended_at: { $exists: false }, updatedAt: assignment.updatedAt },
    { $set: { ended_at: now, ended_by: actor, ended_reason: 'moved', updatedAt: now } },
    (current) => current.ended_reason === 'moved' && sameDate(current.ended_at, now), { session }));
  await runStep(journal, 'destination_occupied', () => ensureStorageUpdate(StorageUnits, destination._id,
    { availability_status: 'reserved', owner: owner._id, updatedAt: destination.updatedAt },
    { $set: { availability_status: 'occupied', updatedAt: now } },
    (current) => current.availability_status === 'occupied' && current.owner === owner._id && sameDate(current.updatedAt, now),
    { session }));
  const sourceSet = move.requires_inspection
    ? { availability_status: 'awaiting_clearance', updatedAt: now }
    : { availability_status: 'available', updatedAt: now };
  const sourceModifier = move.requires_inspection ? { $set: sourceSet } : { $set: sourceSet, $unset: { owner: '' } };
  await runStep(journal, 'source_released', () => ensureStorageUpdate(StorageUnits, source._id,
    { availability_status: 'occupied', owner: owner._id, updatedAt: source.updatedAt },
    sourceModifier,
    (current) => current.availability_status === sourceSet.availability_status &&
      (move.requires_inspection ? current.owner === owner._id : !current.owner) && sameDate(current.updatedAt, now),
    { session }));
  await runStep(journal, 'new_assignment_inserted', () => ensureStorageDocument(StorageAssignments, STORAGE_SCHEMAS.assignment, {
    _id: newAssignmentId,
    unit: destination._id,
    owner: owner._id,
    request: request._id,
    assigned_at: now,
    assigned_by: actor,
    createdAt: now,
    updatedAt: now,
  }, { session, matches: (current) => current.unit === destination._id && current.owner === owner._id }));
  await runStep(journal, 'request_fulfilled', () => ensureStorageUpdate(StorageRequests, request._id,
    { request_status: 'in_progress', updatedAt: request.updatedAt },
    { $set: { request_status: 'fulfilled', fulfilled_at: now, updatedAt: now } },
    (current) => current.request_status === 'fulfilled' && sameDate(current.fulfilled_at, now), { session }));
  await runStep(journal, 'move_completed', () => ensureStorageUpdate(StorageMoves, move._id,
    { move_status: 'pending', updatedAt: move.updatedAt },
    { $set: { move_status: 'completed', completed_at: now, completed_by: actor, completed_by_type: actorType, updatedAt: now } },
    (current) => current.move_status === 'completed' && sameDate(current.completed_at, now), { session }));
  await runStep(journal, 'event_inserted', () => appendStorageEvent({
    id: ids.event,
    entityType: 'storageMove', entityId: move._id, eventType: 'move_completed',
    actorType, actor, occurredAt: now,
    details: { new_assignment: newAssignmentId, requires_inspection: move.requires_inspection },
  }, { session }));
  return { decision_id: move._id, assignment_id: newAssignmentId };
};

const reviewExpiredMove = async (records, selection, actor, now, session, journal, ids = {}) => {
  const { owner, move } = records;
  ensure(owner && move?.move_status === 'pending', 'Move is no longer pending');
  if (selection.resolution === 'complete') {
    return completeMove(records, actor, 'administrator', now, session, journal, ids);
  }
  if (selection.resolution === 'extend') {
    const extendTo = new Date(selection.extend_to);
    if (Number.isNaN(extendTo.getTime()) || extendTo <= now) {
      throw new Meteor.Error('bad-date', 'Move extension must be in the future');
    }
    await runStep(journal, 'move_extended', () => ensureStorageUpdate(StorageMoves, move._id,
      { _id: move._id, move_status: 'pending', updatedAt: move.updatedAt },
      { $set: { deadline_at: extendTo, updatedAt: now } },
      (current) => sameDate(current.deadline_at, extendTo) && sameDate(current.updatedAt, now), { session }));
    await runStep(journal, 'event_inserted', () => event(
      'storageMove', move._id, 'move_extended', actor, now,
      { deadline_at: extendTo }, session, undefined, ids.event,
    ));
    return { decision_id: move._id };
  }
  if (selection.resolution === 'cancel') {
    const destination = records.unit || await StorageUnits.findOneAsync(move.to_unit);
    const request = records.request || await StorageRequests.findOneAsync(move.request);
    ensure(destination && request, 'Move references are missing');
    await runStep(journal, 'destination_released', () => ensureStorageUpdate(StorageUnits, destination._id,
      { _id: destination._id, availability_status: 'reserved', owner: owner._id, updatedAt: destination.updatedAt },
      { $set: { availability_status: 'available', updatedAt: now }, $unset: { owner: '' } },
      (current) => current.availability_status === 'available' && !current.owner && sameDate(current.updatedAt, now),
      { session }));
    await runStep(journal, 'move_cancelled', () => ensureStorageUpdate(StorageMoves, move._id,
      { _id: move._id, move_status: 'pending', updatedAt: move.updatedAt },
      { $set: { move_status: 'cancelled', cancelled_at: now, cancelled_by: actor, cancellation_reason: selection.reason || 'Expired move cancelled', updatedAt: now } },
      (current) => current.move_status === 'cancelled' && sameDate(current.cancelled_at, now), { session }));
    const cancelRequest = selection.cancel_request === true;
    await runStep(journal, 'request_resolved', () => ensureStorageUpdate(StorageRequests, request._id,
      { _id: request._id, request_status: 'in_progress', updatedAt: request.updatedAt },
      cancelRequest
        ? { $set: { request_status: 'cancelled', cancelled_at: now, updatedAt: now } }
        : { $set: { request_status: 'waiting', updatedAt: now }, $unset: { fulfilled_at: '', cancelled_at: '' } },
      (current) => current.request_status === (cancelRequest ? 'cancelled' : 'waiting') && sameDate(current.updatedAt, now),
      { session }));
    await runStep(journal, 'event_inserted', () => event(
      'storageMove', move._id, 'move_cancelled', actor, now,
      { request_returned_to_queue: !cancelRequest }, session, selection.reason, ids.event,
    ));
    return { decision_id: move._id };
  }
  throw new Meteor.Error('bad-resolution', 'Choose complete, extend, or cancel');
};

const clearUnit = async (records, actor, now, session, journal, ids = {}) => {
  const { unit } = records;
  ensure(unit?.availability_status === 'awaiting_clearance', 'Unit is no longer awaiting clearance');
  await runStep(journal, 'unit_available', () => ensureStorageUpdate(StorageUnits, unit._id,
    { availability_status: 'awaiting_clearance', updatedAt: unit.updatedAt },
    { $set: { availability_status: 'available', updatedAt: now }, $unset: { owner: '' } },
    (current) => current.availability_status === 'available' && !current.owner && sameDate(current.updatedAt, now),
    { session }));
  await runStep(journal, 'event_inserted', () => event(
    'storageUnit', unit._id, 'physical_clearance_confirmed', actor, now, {}, session, undefined, ids.event,
  ));
  return { decision_id: unit._id };
};

const applySuggestedAction = async (action, row, selection, actor, now, session, journal, ids, storedRecords) => {
  const records = storedRecords || await loadRowRecords(row);
  if (action === 'allocate') {
    return row.decision_type === 'move'
      ? reserveMove(records, actor, now, session, {
        requiresInspection: selection.requires_inspection === true,
      }, journal, ids)
      : applyAssignment(records, actor, now, session, journal, ids);
  }
  if (action === 'warn') return applyWarning(records, actor, now, session, journal, ids);
  if (action === 'remind') return applyReminder(records, actor, now, session, journal, ids);
  if (action === 'reclaim') {
    return endForClearance({
      records, actor, now, reason: 'reclaimed', warning: records.warning,
      contactConfirmation: {
        confirmed: selection.manual_contact_confirmed === true,
        reason: selection.manual_contact_reason,
      },
      session, journal, ids,
    });
  }
  if (action === 'release') {
    return endForClearance({ records, actor, now, reason: 'voluntary_release', request: records.request, session, journal, ids });
  }
  if (action === 'review_expired_moves') {
    return reviewExpiredMove(records, selection, actor, now, session, journal, ids);
  }
  if (action === 'confirm_clearance') return clearUnit(records, actor, now, session, journal, ids);
  throw new Meteor.Error('bad-action', 'Unknown storage action');
};

const executeRow = async ({ action, commandId, selection, row, actor }) => {
  const id = receiptId(actor, action, commandId, row.suggestion_id);
  const existing = await StorageActionExecutions.findOneAsync(id);
  if (existing?.execution_status === 'completed') {
    return { suggestion_id: row.suggestion_id, status: 'already_applied', ...existing.result };
  }
  if (!existing && action === 'allocate') {
    const readiness = await storageAllocationReadiness();
    if (!readiness.allocation_ready) {
      return {
        suggestion_id: row.suggestion_id,
        status: 'stale',
        reason: 'Storage allocation readiness changed',
        readiness,
      };
    }
  }
  const records = existing?.operation_payload?.records || await loadRowRecords(row);
  const now = existing?.operation_payload?.now || new Date();
  const ids = existing?.operation_payload?.ids || {
    decision: `${id}:decision`, assignment: `${id}:assignment`,
    event: `${id}:event`,
  };
  const payload = existing?.operation_payload || { action, row, selection, actor, now, ids, records };
  const spec = {
    id, commandId, suggestionId: row.suggestion_id, actionType: action,
    kind: `suggested.${action}`,
    targetType: row.move ? 'storageMove' : row.assignment ? 'storageAssignment' : row.unit ? 'storageUnit' : 'storageRequest',
    targetId: row.move || row.assignment || row.unit || row.request,
    actor, payload, now,
    callerIntent: { action, actor, suggestion_id: row.suggestion_id, selection },
  };
  const run = (session) => journaledStorageOperation(spec, (journal) =>
    applySuggestedAction(
      payload.action, payload.row, payload.selection, payload.actor, payload.now,
      session, journal, payload.ids, payload.records,
    ), { session });
  try {
    const result = await runStorageAtomic({
      transactional: (session) => run(session),
      fallback: () => run(undefined),
    });
    return { suggestion_id: row.suggestion_id, status: 'applied', ...result };
  } catch (error) {
    const conflict = error instanceof StorageConflictError || isDuplicateKeyError(error);
    const status = conflict ? 'conflict' : 'failed';
    return { suggestion_id: row.suggestion_id, status, reason: error.message };
  }
};

export const confirmStorageSuggestions = async ({ action, commandId, selections, actor }) => {
  if (!commandId || typeof commandId !== 'string') throw new Meteor.Error('bad-command', 'command_id is required');
  if (!Array.isArray(selections) || selections.length === 0) {
    throw new Meteor.Error('bad-selection', 'Select at least one suggested action');
  }
  const normalizedSelections = canonicalSelections(selections);
  if (new Set(normalizedSelections.map((item) => item.suggestion_id)).size !== normalizedSelections.length) {
    throw new Meteor.Error('bad-selection', 'A suggestion may only appear once in a command');
  }
  const batchOperationId = batchId(actor, action, commandId);
  await journaledStorageOperation({
    id: batchOperationId, commandId, suggestionId: batchOperationId, actionType: action,
    kind: 'suggested.batch', targetType: 'storageBatch', targetId: commandId,
    actor, payload: { action, actor, selections: normalizedSelections },
    callerIntent: { action, actor, selections: normalizedSelections },
  }, async () => ({ locked: true }));
  await reconcileStorageState();
  const preview = await previewStorageSuggestions(action);
  const currentById = new Map(preview.rows.map((item) => [item.suggestion_id, item]));
  const results = [];
  for (const selection of normalizedSelections) {
    const prior = await StorageActionExecutions.findOneAsync(receiptId(actor, action, commandId, selection.suggestion_id));
    if (prior?.operation_kind === `suggested.${action}` && prior.execution_status !== 'completed') {
      results.push(await executeRow({
        action, commandId, selection: prior.operation_payload.selection,
        row: prior.operation_payload.row, actor: prior.operation_payload.actor,
      }));
      continue;
    }
    const current = currentById.get(selection.suggestion_id);
    if (!current) {
      results.push(prior?.execution_status === 'completed'
        ? { suggestion_id: selection.suggestion_id, status: 'already_applied', ...prior.result }
        : { suggestion_id: selection.suggestion_id, status: 'stale' });
      continue;
    }
    results.push(await executeRow({ action, commandId, selection, row: current, actor }));
  }
  return { command_id: commandId, results };
};

export const completeStorageMove = async ({ moveId, actor, actorType }) => {
  const id = storageOperationId('move.complete', actorType, actor, moveId);
  const prior = await StorageActionExecutions.findOneAsync(id);
  const move = prior?.operation_payload?.move || await StorageMoves.findOneAsync(moveId);
  if (!move) throw new Meteor.Error('not-found', 'Move not found');
  const owner = prior?.operation_payload?.owner || await Members.findOneAsync(move.owner);
  const now = prior?.operation_payload?.now || new Date();
  const ids = prior?.operation_payload?.ids || {
    assignment: `${id}:assignment`, event: `${id}:event`,
  };
  const payload = prior?.operation_payload || { move, owner, actor, actorType, now, ids };
  const spec = {
    id, actionType: 'move_completion', kind: 'move.complete', targetType: 'storageMove',
    targetId: moveId, actor, payload, now,
    callerIntent: { kind: 'move.complete', actor, actor_type: actorType, move_id: moveId },
  };
  const run = (session) => journaledStorageOperation(spec, (journal) => completeMove(
    { owner: payload.owner, move: payload.move }, payload.actor, payload.actorType,
    payload.now, session, journal, payload.ids,
  ), { session });
  return runStorageAtomic({
    transactional: run,
    fallback: () => run(),
  });
};
