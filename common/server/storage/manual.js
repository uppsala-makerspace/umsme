import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import { Members } from '/imports/common/collections/members';
import {
  StorageWalls,
  StorageUnits,
  StorageRequests,
  StorageAssignments,
  StorageExemptions,
  StorageMoves,
  StorageActionExecutions,
} from '/imports/common/collections/storage';
import { hasActiveLabMembershipAt } from '/imports/common/lib/storageRules';
import { runStorageAtomic } from './atomic';
import { STORAGE_SCHEMAS, casStorageUpdate, insertStorageDocument, validateStorageDocument } from './db';
import { appendStorageEvent } from './events';
import { completeStorageMove } from './commands';
import { reconcileStorageState } from './reconciliation';
import { storageOwnerForMember } from './access';
import { ensureStorageDocument, ensureStorageUpdate } from './effects';
import { journaledStorageOperation, storageOperationId } from './journal';
import { stableStorageMigrationString } from '/imports/common/lib/legacyStorageMigrationFingerprint';

const requiredReason = (reason) => {
  const value = String(reason || '').trim();
  if (!value) throw new Meteor.Error('missing-reason', 'A reason is required');
  return value;
};

const allowedWallFields = ['name', 'floor', 'display_order', 'column_count', 'row_count', 'note', 'active'];
const allowedUnitFields = ['name', 'height', 'wall_id', 'column', 'row', 'availability_status', 'note'];
const sameDate = (a, b) => a instanceof Date && b instanceof Date && a.getTime() === b.getTime();

const manualOperationId = (kind, actor, commandId) => commandId
  ? storageOperationId('manual', kind, actor, commandId)
  : null;
const runManualOperation = async ({ kind, targetType, targetId, actor, commandId, payload, intent, now }, execute) => {
  const id = manualOperationId(kind, actor, commandId) ||
    storageOperationId('manual', kind, actor, stableStorageMigrationString({ targetId, intent }));
  const prior = await StorageActionExecutions.findOneAsync(id);
  if (prior && (prior.created_by !== actor || prior.operation_kind !== `manual.${kind}`)) {
    throw new Meteor.Error('not-authorized', 'Storage command belongs to another administrator or method');
  }
  const durablePayload = prior?.operation_payload || {
    ...payload, operation_id: id, operation_now: now, operation_actor: actor,
  };
  const spec = {
    id, commandId: commandId || id, actionType: 'manual', kind: `manual.${kind}`,
    targetType, targetId, actor, payload: durablePayload, now: durablePayload.operation_now,
    callerIntent: { kind: `manual.${kind}`, actor, target_type: targetType, target_id: targetId, ...intent },
  };
  const run = (session) => journaledStorageOperation(spec, (journal) =>
    execute(journal, journal.payload, session), { session });
  return runStorageAtomic({ transactional: run, fallback: () => run() });
};

const storageWallLocation = async ({ wallId, column, row, requireActive = false }) => {
  const wall = await StorageWalls.findOneAsync(wallId);
  if (!wall) throw new Meteor.Error('not-found', 'Storage wall not found');
  if (requireActive && !wall.active) throw new Meteor.Error('bad-state', 'New units require an active wall');
  if (!Number.isInteger(column) || !Number.isInteger(row) ||
      column < 1 || row < 1 || column > wall.column_count || row > wall.row_count) {
    throw new Meteor.Error('bad-location', 'Storage unit coordinates are outside the wall layout');
  }
  return wall;
};

export const createStorageWallManual = async ({ fields, actor, commandId, now = new Date() }) => {
  const wallId = commandId ? `${manualOperationId('wall.create', actor, commandId)}:wall` : Random.id();
  const doc = {
    _id: wallId,
    ...Object.fromEntries(allowedWallFields.filter((key) => fields[key] !== undefined)
      .map((key) => [key, fields[key]])),
    active: fields.active === undefined ? true : fields.active,
    createdAt: now,
    updatedAt: now,
  };
  return runManualOperation({
    kind: 'wall.create', targetType: 'storageWall', targetId: wallId,
    actor, commandId, payload: { doc }, intent: { fields }, now,
  }, async (journal, payload, session) => {
    await journal.step('wall_inserted', () => ensureStorageDocument(
      StorageWalls, STORAGE_SCHEMAS.wall, payload.doc,
      { session, matches: (current) => current.name === payload.doc.name },
    ));
    await journal.step('event_inserted', () => appendStorageEvent({
      id: `${payload.operation_id}:event`, entityType: 'storageWall', entityId: payload.doc._id,
      eventType: 'wall_created', actorType: 'administrator', actor: payload.operation_actor,
      occurredAt: payload.operation_now,
    }, { session }));
    return payload.doc._id;
  });
};

export const updateStorageWallManual = async ({ wallId, fields, actor, commandId, now = new Date() }) => {
  const wall = await StorageWalls.findOneAsync(wallId);
  if (!wall) throw new Meteor.Error('not-found', 'Storage wall not found');
  const changes = Object.fromEntries(allowedWallFields.filter((key) => fields[key] !== undefined)
    .map((key) => [key, fields[key]]));
  const candidate = { ...wall, ...changes, updatedAt: now };
  if (candidate.note === null || candidate.note === '') delete candidate.note;
  validateStorageDocument(STORAGE_SCHEMAS.wall, candidate);
  const unitSelector = { wall_id: wallId };
  if (fields.floor !== undefined && fields.floor !== wall.floor && await StorageUnits.findOneAsync(unitSelector)) {
    throw new Meteor.Error('wall-not-empty', 'Move all units before changing the wall floor');
  }
  const columnCount = fields.column_count ?? wall.column_count;
  const rowCount = fields.row_count ?? wall.row_count;
  if (await StorageUnits.findOneAsync({
    ...unitSelector,
    $or: [{ column: { $gt: columnCount } }, { row: { $gt: rowCount } }],
  })) {
    throw new Meteor.Error('wall-layout-in-use', 'The smaller wall layout would exclude existing units');
  }
  const $set = { updatedAt: now };
  const $unset = {};
  for (const key of allowedWallFields) {
    if (fields[key] === undefined) continue;
    if (key === 'note' && (fields[key] === null || fields[key] === '')) $unset[key] = '';
    else $set[key] = fields[key];
  }
  const modifier = { $set, ...(Object.keys($unset).length ? { $unset } : {}) };
  return runManualOperation({
    kind: 'wall.update', targetType: 'storageWall', targetId: wallId,
    actor, commandId, payload: { wall, modifier, fields: changes }, intent: { fields: changes }, now,
  }, async (journal, payload, session) => {
    await journal.step('wall_updated', () => ensureStorageUpdate(
      StorageWalls, wallId, { updatedAt: payload.wall.updatedAt }, payload.modifier,
      (current) => sameDate(current.updatedAt, payload.operation_now), { session },
    ));
    await journal.step('event_inserted', () => appendStorageEvent({
      id: `${payload.operation_id}:event`, entityType: 'storageWall', entityId: wallId,
      eventType: 'wall_updated', actorType: 'administrator', actor: payload.operation_actor,
      occurredAt: payload.operation_now, details: { changed_fields: Object.keys(payload.fields) },
    }, { session }));
    return true;
  });
};

export const createStorageUnitManual = async ({ fields, actor, commandId, now = new Date() }) => {
  if (fields.owner !== undefined) throw new Meteor.Error('bad-field', 'New storage units cannot have an owner');
  if (fields.availability_status !== undefined && !['available', 'unavailable'].includes(fields.availability_status)) {
    throw new Meteor.Error('bad-state', 'New storage units must be available or unavailable');
  }
  const wall = await storageWallLocation({
    wallId: fields.wall_id, column: fields.column, row: fields.row, requireActive: true,
  });
  const unitId = commandId ? `${manualOperationId('unit.create', actor, commandId)}:unit` : Random.id();
  const doc = {
    _id: unitId,
    ...Object.fromEntries(allowedUnitFields.filter((key) => fields[key] !== undefined).map((key) => [key, fields[key]])),
    floor: wall.floor,
    createdAt: now,
    updatedAt: now,
  };
  if (doc.availability_status === undefined) doc.availability_status = 'available';
  return runManualOperation({
    kind: 'unit.create', targetType: 'storageUnit', targetId: unitId,
    actor, commandId, payload: { doc }, intent: { fields }, now,
  }, async (journal, payload, session) => {
    await journal.step('unit_inserted', () => ensureStorageDocument(
      StorageUnits, STORAGE_SCHEMAS.unit, payload.doc,
      { session, matches: (current) => current.name === payload.doc.name },
    ));
    await journal.step('event_inserted', () => appendStorageEvent({
      id: `${payload.operation_id}:event`,
      entityType: 'storageUnit', entityId: payload.doc._id, eventType: 'unit_created',
      actorType: 'administrator', actor: payload.operation_actor, occurredAt: payload.operation_now,
    }, { session }));
    return payload.doc._id;
  });
};

export const updateStorageUnitManual = async ({ unitId, fields, actor, commandId, acknowledged = false, now = new Date() }) => {
  const unit = await StorageUnits.findOneAsync(unitId);
  if (!unit) throw new Meteor.Error('not-found', 'Storage unit not found');
  const changes = Object.fromEntries(allowedUnitFields.filter((key) => fields[key] !== undefined)
    .map((key) => [key, fields[key]]));
  const metadataChanged = ['name', 'height', 'wall_id', 'column', 'row']
    .some((key) => fields[key] !== undefined && fields[key] !== unit[key]);
  if (metadataChanged && ['occupied', 'reserved'].includes(unit.availability_status) && !acknowledged) {
    throw new Meteor.Error('acknowledgement-required', 'Confirm metadata changes to an occupied or reserved unit');
  }
  if (fields.owner !== undefined) throw new Meteor.Error('bad-field', 'Owner changes require an assignment operation');
  if (fields.availability_status !== undefined && fields.availability_status !== unit.availability_status) {
    if (unit.owner || !['available', 'unavailable'].includes(fields.availability_status)) {
      throw new Meteor.Error('bad-state', 'Lifecycle availability changes require their dedicated operation');
    }
  }
  const wallId = fields.wall_id ?? unit.wall_id;
  const column = fields.column ?? unit.column;
  const row = fields.row ?? unit.row;
  const wall = await storageWallLocation({
    wallId, column, row, requireActive: wallId !== unit.wall_id,
  });
  const candidate = { ...unit, ...changes, floor: wall.floor, updatedAt: now };
  if (candidate.height === null || candidate.height === '') delete candidate.height;
  if (candidate.note === null || candidate.note === '') delete candidate.note;
  validateStorageDocument(STORAGE_SCHEMAS.unit, candidate);
  const $set = { updatedAt: now };
  const $unset = {};
  for (const key of allowedUnitFields) {
    if (fields[key] === undefined) continue;
    if ((key === 'height' || key === 'note') && (fields[key] === null || fields[key] === '')) $unset[key] = '';
    else $set[key] = fields[key];
  }
  $set.floor = wall.floor;
  const modifier = { $set, ...(Object.keys($unset).length ? { $unset } : {}) };
  return runManualOperation({
    kind: 'unit.update', targetType: 'storageUnit', targetId: unitId,
    actor, commandId, payload: { unit, modifier, fields: changes }, intent: { fields: changes, acknowledged }, now,
  }, async (journal, payload, session) => {
    await journal.step('unit_updated', () => ensureStorageUpdate(
      StorageUnits, unitId, { updatedAt: payload.unit.updatedAt }, payload.modifier,
      (current) => sameDate(current.updatedAt, payload.operation_now), { session },
    ));
    await journal.step('event_inserted', () => appendStorageEvent({
      id: `${payload.operation_id}:event`,
      entityType: 'storageUnit', entityId: unitId, eventType: 'unit_updated',
      actorType: 'administrator', actor: payload.operation_actor, occurredAt: payload.operation_now,
      details: { changed_fields: Object.keys(payload.fields) },
    }, { session }));
    return true;
  });
};

export const bulkSetStorageHeightManual = async ({ unitIds, height, actor, commandId, acknowledged = false }) => {
  if (!['low', 'high'].includes(height)) throw new Meteor.Error('bad-height', 'Height must be low or high');
  const results = [];
  for (const unitId of [...new Set(unitIds)]) {
    try {
      await updateStorageUnitManual({
        unitId, fields: { height }, actor, acknowledged,
        commandId: commandId ? `${commandId}:${unitId}` : undefined,
      });
      results.push({ unitId, status: 'updated' });
    } catch (error) {
      results.push({ unitId, status: 'failed', reason: error.message });
    }
  }
  return results;
};

export const assignStorageUnitManual = async ({ unitId, ownerId, actor, commandId, override = false, reason, now = new Date() }) => {
  const operationKey = commandId || stableStorageMigrationString({ unitId, ownerId, actor, now });
  const operationId = manualOperationId('assignment.create', actor, commandId) ||
    storageOperationId('manual', 'assignment.create', actor, operationKey);
  const prior = commandId ? await StorageActionExecutions.findOneAsync(operationId) : null;
  let operationPayload = prior?.operation_payload;
  if (!operationPayload) {
    const [unit, selectedOwner] = await Promise.all([
      StorageUnits.findOneAsync(unitId), Members.findOneAsync(ownerId),
    ]);
    if (!unit || !selectedOwner) throw new Meteor.Error('not-found', 'Unit or member not found');
    const owner = await storageOwnerForMember(selectedOwner);
    const [ownerAssignment, request] = await Promise.all([
      StorageAssignments.findOneAsync({ owner: owner._id, ended_at: { $exists: false } }),
      StorageRequests.findOneAsync({ owner: owner._id, request_type: 'allocation', request_status: 'waiting' }),
    ]);
    const needsOverride = unit.availability_status !== 'available' || ownerAssignment ||
      !hasActiveLabMembershipAt(owner, now) || !request;
    if (needsOverride && !override) throw new Meteor.Error('override-required', 'A reason and explicit override are required');
    const overrideReason = needsOverride ? requiredReason(reason) : undefined;
    if (unit.availability_status !== 'available') throw new Meteor.Error('bad-state', 'Only an available unit can be manually assigned');
    if (ownerAssignment) throw new Meteor.Error('bad-state', 'Owner already has active storage');
    operationPayload = {
      unit, owner, request, assignmentId: `${operationId}:assignment`, overrideReason, needsOverride,
    };
  }
  return runManualOperation({
    kind: 'assignment.create', targetType: 'storageUnit', targetId: unitId,
    actor, commandId, payload: operationPayload, intent: { ownerId, override, reason }, now,
  }, async (journal, payload, session) => {
    await journal.step('unit_occupied', () => ensureStorageUpdate(StorageUnits, unitId,
      { availability_status: 'available', owner: { $exists: false }, updatedAt: payload.unit.updatedAt },
      { $set: { availability_status: 'occupied', owner: payload.owner._id, updatedAt: payload.operation_now } },
      (current) => current.availability_status === 'occupied' && current.owner === payload.owner._id && sameDate(current.updatedAt, payload.operation_now),
      { session }));
    await journal.step('assignment_inserted', () => ensureStorageDocument(StorageAssignments, STORAGE_SCHEMAS.assignment, {
      _id: payload.assignmentId, unit: unitId, owner: payload.owner._id,
      ...(payload.request ? { request: payload.request._id } : {}),
      assigned_at: payload.operation_now, assigned_by: payload.operation_actor,
      createdAt: payload.operation_now, updatedAt: payload.operation_now,
    }, { session, matches: (current) => current.unit === unitId && current.owner === payload.owner._id }));
    if (payload.request) {
      await journal.step('request_fulfilled', () => ensureStorageUpdate(StorageRequests, payload.request._id,
        { request_status: 'waiting', updatedAt: payload.request.updatedAt },
        { $set: { request_status: 'fulfilled', fulfilled_at: payload.operation_now, updatedAt: payload.operation_now } },
        (current) => current.request_status === 'fulfilled' && sameDate(current.fulfilled_at, payload.operation_now), { session }));
    }
    await journal.step('event_inserted', () => appendStorageEvent({
      id: `${payload.operation_id}:event`,
      entityType: 'storageAssignment', entityId: payload.assignmentId, eventType: 'manual_assignment_created',
      actorType: 'administrator', actor: payload.operation_actor, occurredAt: payload.operation_now,
      ...(payload.overrideReason ? { reason: payload.overrideReason } : {}),
      details: { override: payload.needsOverride, ...(payload.request ? { request: payload.request._id } : {}) },
    }, { session }));
    return payload.assignmentId;
  });
};

export const endStorageAssignmentManual = async ({ assignmentId, actor, reason, commandId, now = new Date() }) => {
  const correctionReason = requiredReason(reason);
  const id = manualOperationId('assignment.end', actor, commandId);
  const prior = id ? await StorageActionExecutions.findOneAsync(id) : null;
  let payload = prior?.operation_payload;
  if (!payload) {
    const assignment = await StorageAssignments.findOneAsync(assignmentId);
    if (!assignment || assignment.ended_at) throw new Meteor.Error('bad-state', 'Active assignment not found');
    const unit = await StorageUnits.findOneAsync(assignment.unit);
    if (!unit) throw new Meteor.Error('not-found', 'Storage unit not found');
    payload = { assignment, unit, correctionReason };
  }
  return runManualOperation({
    kind: 'assignment.end', targetType: 'storageAssignment', targetId: assignmentId,
    actor, commandId, payload, intent: { reason }, now,
  }, async (journal, durable, session) => {
    await journal.step('assignment_ended', () => ensureStorageUpdate(StorageAssignments, assignmentId,
      { ended_at: { $exists: false }, updatedAt: durable.assignment.updatedAt },
      { $set: { ended_at: durable.operation_now, ended_by: durable.operation_actor, ended_reason: 'correction', updatedAt: durable.operation_now } },
      (current) => current.ended_reason === 'correction' && sameDate(current.ended_at, durable.operation_now), { session }));
    await journal.step('unit_awaiting_clearance', () => ensureStorageUpdate(StorageUnits, durable.unit._id,
      { owner: durable.assignment.owner, updatedAt: durable.unit.updatedAt },
      { $set: { availability_status: 'awaiting_clearance', updatedAt: durable.operation_now } },
      (current) => current.availability_status === 'awaiting_clearance' && current.owner === durable.assignment.owner && sameDate(current.updatedAt, durable.operation_now),
      { session }));
    await journal.step('event_inserted', () => appendStorageEvent({
      id: `${durable.operation_id}:event`, entityType: 'storageAssignment', entityId: assignmentId,
      eventType: 'manual_assignment_ended', actorType: 'administrator', actor: durable.operation_actor,
      occurredAt: durable.operation_now, reason: durable.correctionReason,
    }, { session }));
    return true;
  });
};

export const createStorageExemptionManual = async ({ assignmentId, actor, reason, exemptUntil, commandId, now = new Date() }) => {
  const explanation = requiredReason(reason);
  const id = manualOperationId('exemption.create', actor, commandId);
  const prior = id ? await StorageActionExecutions.findOneAsync(id) : null;
  let payload = prior?.operation_payload;
  if (!payload) {
    await reconcileStorageState({ now });
    const assignment = await StorageAssignments.findOneAsync(assignmentId);
    if (!assignment || assignment.ended_at) throw new Meteor.Error('bad-state', 'Active assignment not found');
    payload = {
      assignment, explanation,
      exemptionId: commandId ? `${manualOperationId('exemption.create', actor, commandId)}:exemption` : Random.id(),
      ...(exemptUntil ? { exemptUntil: new Date(exemptUntil) } : {}),
    };
  }
  return runManualOperation({
    kind: 'exemption.create', targetType: 'storageAssignment', targetId: assignmentId,
    actor, commandId, payload, intent: { reason, exemptUntil }, now,
  }, async (journal, durable, session) => {
    await journal.step('assignment_claimed', () => ensureStorageUpdate(StorageAssignments, assignmentId,
      { ended_at: { $exists: false }, updatedAt: durable.assignment.updatedAt },
      { $set: { updatedAt: durable.operation_now } },
      (current) => !current.ended_at && sameDate(current.updatedAt, durable.operation_now), { session }));
    await journal.step('exemption_inserted', () => ensureStorageDocument(StorageExemptions, STORAGE_SCHEMAS.exemption, {
      _id: durable.exemptionId,
      assignment: assignmentId,
      reason: durable.explanation,
      ...(durable.exemptUntil ? { exempt_until: durable.exemptUntil } : {}),
      active: true,
      created_at: durable.operation_now, created_by: durable.operation_actor, updatedAt: durable.operation_now,
    }, { session, matches: (current) => current.assignment === assignmentId && current.active }));
    await journal.step('event_inserted', () => appendStorageEvent({
      id: `${durable.operation_id}:event`, entityType: 'storageExemption', entityId: durable.exemptionId,
      eventType: 'exemption_created', actorType: 'administrator', actor: durable.operation_actor,
      occurredAt: durable.operation_now, reason: durable.explanation,
      details: { assignment: assignmentId, exempt_until: durable.exemptUntil },
    }, { session }));
    return durable.exemptionId;
  });
};

export const revokeStorageExemptionManual = async ({ exemptionId, actor, commandId, now = new Date() }) => {
  const id = manualOperationId('exemption.revoke', actor, commandId);
  const prior = id ? await StorageActionExecutions.findOneAsync(id) : null;
  const exemption = prior?.operation_payload?.exemption || await StorageExemptions.findOneAsync(exemptionId);
  if (!prior && !exemption?.active) throw new Meteor.Error('bad-state', 'Active exemption not found');
  return runManualOperation({
    kind: 'exemption.revoke', targetType: 'storageExemption', targetId: exemptionId,
    actor, commandId, payload: prior?.operation_payload || { exemption }, intent: {}, now,
  }, async (journal, payload, session) => {
    await journal.step('exemption_revoked', () => ensureStorageUpdate(StorageExemptions, exemptionId,
      { active: true, updatedAt: payload.exemption.updatedAt },
      { $set: { active: false, revoked_at: payload.operation_now, revoked_by: payload.operation_actor, updatedAt: payload.operation_now } },
      (current) => !current.active && sameDate(current.revoked_at, payload.operation_now), { session }));
    await journal.step('event_inserted', () => appendStorageEvent({
      id: `${payload.operation_id}:event`, entityType: 'storageExemption', entityId: exemptionId,
      eventType: 'exemption_revoked', actorType: 'administrator', actor: payload.operation_actor,
      occurredAt: payload.operation_now,
    }, { session }));
    return true;
  });
};

export const completeStorageMoveManual = ({ moveId, actor }) =>
  completeStorageMove({ moveId, actor, actorType: 'administrator' });

export const upsertStorageRequestManual = async ({
  ownerId, requestId, requestType, preference, requestedAt, actor, reason, commandId, now = new Date(),
}) => {
  const operationId = manualOperationId('request.upsert', actor, commandId);
  const prior = operationId ? await StorageActionExecutions.findOneAsync(operationId) : null;
  if (prior) {
    return runManualOperation({
      kind: 'request.upsert', targetType: 'storageRequest', targetId: prior.operation_payload.requestId,
      actor, commandId, payload: prior.operation_payload,
      intent: { ownerId, requestId, requestType, preference, requestedAt, reason }, now,
    }, executeManualRequestUpsert);
  }
  if (!['allocation', 'move', 'release'].includes(requestType)) {
    throw new Meteor.Error('bad-request-type', 'Invalid storage request type');
  }
  const selectedOwner = await Members.findOneAsync(ownerId);
  if (!selectedOwner) throw new Meteor.Error('not-found', 'Member not found');
  const owner = await storageOwnerForMember(selectedOwner);
  ownerId = owner._id;
  const assignment = await StorageAssignments.findOneAsync({ owner: ownerId, ended_at: { $exists: false } });
  if (requestType === 'allocation' && assignment) {
    throw new Meteor.Error('bad-state', 'A member with storage must request a move or release');
  }
  if (requestType !== 'allocation' && !assignment) {
    throw new Meteor.Error('bad-state', 'Move and release requests require an active assignment');
  }
  const existing = requestId
    ? await StorageRequests.findOneAsync(requestId)
    : await StorageRequests.findOneAsync({
      owner: ownerId,
      request_status: { $in: ['waiting', 'paused_ineligible', 'in_progress'] },
    });
  if (requestId && !existing) throw new Meteor.Error('not-found', 'Storage request not found');
  if (existing && existing.owner !== ownerId) {
    throw new Meteor.Error('not-authorized', 'Request belongs to another storage owner');
  }
  const queueDate = requestedAt ? new Date(requestedAt) : (existing?.requested_at || now);
  if (Number.isNaN(queueDate.getTime())) throw new Meteor.Error('bad-date', 'Invalid queue date');
  if (requestedAt && (!existing || queueDate.getTime() !== existing.requested_at.getTime())) requiredReason(reason);
  const normalizedPreference = requestType === 'release' ? undefined : (preference || undefined);
  if (requestType === 'move' && !normalizedPreference) {
    throw new Meteor.Error('bad-preference', 'A move request needs a preference');
  }
  const sourceAssignment = requestType === 'allocation' ? undefined : assignment?._id;
  if (existing) {
    if (!['waiting', 'paused_ineligible'].includes(existing.request_status)) {
      throw new Meteor.Error('bad-state', 'Request cannot be edited');
    }
    const $set = {
      request_type: requestType,
      requested_at: queueDate,
      request_status: requestType === 'release' || hasActiveLabMembershipAt(owner, now)
        ? 'waiting' : 'paused_ineligible',
      updatedAt: now,
      ...(normalizedPreference ? { preference: normalizedPreference } : {}),
      ...(sourceAssignment ? { source_assignment: sourceAssignment } : {}),
    };
    const $unset = {};
    if (!normalizedPreference) $unset.preference = '';
    if (!sourceAssignment) $unset.source_assignment = '';
    return runManualOperation({
      kind: 'request.upsert', targetType: 'storageRequest', targetId: existing._id,
      actor, commandId, intent: { ownerId, requestId, requestType, preference, requestedAt, reason }, payload: {
        mode: 'update', requestId: existing._id, existing,
        modifier: { $set, ...(Object.keys($unset).length ? { $unset } : {}) }, reason,
      }, now,
    }, executeManualRequestUpsert);
  }
  const id = commandId ? `${manualOperationId('request.upsert', actor, commandId)}:request` : Random.id();
  const document = {
    _id: id, owner: ownerId, request_type: requestType, requested_at: queueDate,
    ...(normalizedPreference ? { preference: normalizedPreference } : {}),
    ...(sourceAssignment ? { source_assignment: sourceAssignment } : {}),
    request_status: requestType === 'release' || hasActiveLabMembershipAt(owner, now)
      ? 'waiting' : 'paused_ineligible',
    createdAt: now, updatedAt: now,
  };
  return runManualOperation({
    kind: 'request.upsert', targetType: 'storageRequest', targetId: id,
    actor, commandId, payload: { mode: 'insert', requestId: id, document, reason },
    intent: { ownerId, requestId, requestType, preference, requestedAt, reason }, now,
  }, executeManualRequestUpsert);
};

const executeManualRequestUpsert = async (journal, payload, session) => {
  if (payload.mode === 'insert') {
    await journal.step('request_written', () => ensureStorageDocument(
      StorageRequests, STORAGE_SCHEMAS.request, payload.document,
      { session, matches: (current) => current.owner === payload.document.owner },
    ));
  } else {
    await journal.step('request_written', () => ensureStorageUpdate(StorageRequests, payload.requestId,
      { updatedAt: payload.existing.updatedAt }, payload.modifier,
      (current) => sameDate(current.updatedAt, payload.operation_now), { session }));
  }
  await journal.step('event_inserted', () => appendStorageEvent({
    id: `${payload.operation_id}:event`, entityType: 'storageRequest', entityId: payload.requestId,
    eventType: payload.mode === 'insert' ? 'manual_request_created' : 'manual_request_updated',
    actorType: 'administrator', actor: payload.operation_actor, occurredAt: payload.operation_now,
    ...(payload.reason ? { reason: payload.reason } : {}),
  }, { session }));
  return payload.requestId;
};

export const cancelStorageRequestManual = async ({ requestId, actor, reason, commandId, now = new Date() }) => {
  const explanation = requiredReason(reason);
  const id = manualOperationId('request.cancel', actor, commandId);
  const prior = id ? await StorageActionExecutions.findOneAsync(id) : null;
  const request = prior?.operation_payload?.request || await StorageRequests.findOneAsync(requestId);
  if (!prior && (!request || !['waiting', 'paused_ineligible'].includes(request.request_status))) {
    throw new Meteor.Error('bad-state', 'Active editable request not found');
  }
  return runManualOperation({
    kind: 'request.cancel', targetType: 'storageRequest', targetId: requestId,
    actor, commandId, payload: prior?.operation_payload || { request, explanation }, intent: { reason }, now,
  }, async (journal, payload, session) => {
    await journal.step('request_cancelled', () => ensureStorageUpdate(StorageRequests, requestId,
      { updatedAt: payload.request.updatedAt },
      { $set: { request_status: 'cancelled', cancelled_at: payload.operation_now, updatedAt: payload.operation_now } },
      (current) => current.request_status === 'cancelled' && sameDate(current.cancelled_at, payload.operation_now), { session }));
    await journal.step('event_inserted', () => appendStorageEvent({
      id: `${payload.operation_id}:event`, entityType: 'storageRequest', entityId: requestId,
      eventType: 'manual_request_cancelled', actorType: 'administrator', actor: payload.operation_actor,
      occurredAt: payload.operation_now, reason: payload.explanation,
    }, { session }));
    return true;
  });
};

export const setStorageRequestPausedManual = async ({ requestId, paused, actor, reason, commandId, now = new Date() }) => {
  const explanation = requiredReason(reason);
  const id = manualOperationId('request.pause', actor, commandId);
  const prior = id ? await StorageActionExecutions.findOneAsync(id) : null;
  const request = prior?.operation_payload?.request || await StorageRequests.findOneAsync(requestId);
  if (!prior && (!request || !['waiting', 'paused_ineligible'].includes(request.request_status))) {
    throw new Meteor.Error('bad-state', 'Active editable request not found');
  }
  if (request.request_type === 'release') {
    throw new Meteor.Error('bad-state', 'Release requests do not depend on lab eligibility');
  }
  const owner = prior ? null : await Members.findOneAsync(request.owner);
  const eligible = prior ? prior.operation_payload.eligible : hasActiveLabMembershipAt(owner, now);
  if (!prior && paused === eligible) {
    throw new Meteor.Error(
      'bad-state',
      paused ? 'An eligible request cannot be marked ineligible' : 'Active lab membership is required to resume',
    );
  }
  const wanted = paused ? 'paused_ineligible' : 'waiting';
  if (!prior && request.request_status === wanted) return true;
  return runManualOperation({
    kind: 'request.pause', targetType: 'storageRequest', targetId: requestId,
    actor, commandId, payload: prior?.operation_payload || { request, paused, eligible, wanted, explanation },
    intent: { paused, reason }, now,
  }, async (journal, payload, session) => {
    await journal.step('request_status_changed', () => ensureStorageUpdate(StorageRequests, requestId,
      { request_status: payload.request.request_status, updatedAt: payload.request.updatedAt },
      { $set: { request_status: payload.wanted, updatedAt: payload.operation_now } },
      (current) => current.request_status === payload.wanted && sameDate(current.updatedAt, payload.operation_now), { session }));
    await journal.step('event_inserted', () => appendStorageEvent({
      id: `${payload.operation_id}:event`, entityType: 'storageRequest', entityId: requestId,
      eventType: payload.paused ? 'manual_request_paused' : 'manual_request_resumed',
      actorType: 'administrator', actor: payload.operation_actor, occurredAt: payload.operation_now,
      reason: payload.explanation, details: { requested_at_preserved: payload.request.requested_at },
    }, { session }));
    return true;
  });
};

export const extendStorageMoveManual = async ({ moveId, extendTo, actor, reason, commandId, now = new Date() }) => {
  const explanation = requiredReason(reason);
  const id = manualOperationId('move.extend', actor, commandId);
  const prior = id ? await StorageActionExecutions.findOneAsync(id) : null;
  const move = prior?.operation_payload?.move || await StorageMoves.findOneAsync(moveId);
  const deadline = new Date(extendTo);
  if (!prior && (!move || move.move_status !== 'pending')) throw new Meteor.Error('bad-state', 'Pending move not found');
  if (!prior && (Number.isNaN(deadline.getTime()) || deadline <= now)) throw new Meteor.Error('bad-date', 'Deadline must be in the future');
  return runManualOperation({
    kind: 'move.extend', targetType: 'storageMove', targetId: moveId,
    actor, commandId, payload: prior?.operation_payload || { move, deadline, explanation },
    intent: { extendTo, reason }, now,
  }, async (journal, payload, session) => {
    await journal.step('move_extended', () => ensureStorageUpdate(StorageMoves, moveId,
      { move_status: 'pending', updatedAt: payload.move.updatedAt },
      { $set: { deadline_at: payload.deadline, updatedAt: payload.operation_now } },
      (current) => sameDate(current.deadline_at, payload.deadline) && sameDate(current.updatedAt, payload.operation_now), { session }));
    await journal.step('event_inserted', () => appendStorageEvent({
      id: `${payload.operation_id}:event`, entityType: 'storageMove', entityId: moveId,
      eventType: 'manual_move_extended', actorType: 'administrator', actor: payload.operation_actor,
      occurredAt: payload.operation_now, reason: payload.explanation, details: { deadline_at: payload.deadline },
    }, { session }));
    return true;
  });
};

export const cancelStorageMoveManual = async ({ moveId, actor, reason, cancelRequest = false, commandId, now = new Date() }) => {
  const explanation = requiredReason(reason);
  const id = manualOperationId('move.cancel', actor, commandId);
  const prior = id ? await StorageActionExecutions.findOneAsync(id) : null;
  let payload = prior?.operation_payload;
  if (!payload) {
    const move = await StorageMoves.findOneAsync(moveId);
    if (!move || move.move_status !== 'pending') throw new Meteor.Error('bad-state', 'Pending move not found');
    const [unit, request] = await Promise.all([
      StorageUnits.findOneAsync(move.to_unit), StorageRequests.findOneAsync(move.request),
    ]);
    if (!unit || !request) throw new Meteor.Error('not-found', 'Move references are missing');
    payload = { move, unit, request, cancelRequest, explanation };
  }
  return runManualOperation({
    kind: 'move.cancel', targetType: 'storageMove', targetId: moveId,
    actor, commandId, payload, intent: { reason, cancelRequest }, now,
  }, async (journal, durable, session) => {
    await journal.step('destination_released', () => ensureStorageUpdate(StorageUnits, durable.unit._id,
      { availability_status: 'reserved', owner: durable.move.owner, updatedAt: durable.unit.updatedAt },
      { $set: { availability_status: 'available', updatedAt: durable.operation_now }, $unset: { owner: '' } },
      (current) => current.availability_status === 'available' && !current.owner && sameDate(current.updatedAt, durable.operation_now), { session }));
    await journal.step('move_cancelled', () => ensureStorageUpdate(StorageMoves, moveId,
      { move_status: 'pending', updatedAt: durable.move.updatedAt },
      { $set: { move_status: 'cancelled', cancelled_at: durable.operation_now, cancelled_by: durable.operation_actor, cancellation_reason: durable.explanation, updatedAt: durable.operation_now } },
      (current) => current.move_status === 'cancelled' && sameDate(current.cancelled_at, durable.operation_now), { session }));
    await journal.step('request_resolved', () => ensureStorageUpdate(StorageRequests, durable.request._id,
      { request_status: 'in_progress', updatedAt: durable.request.updatedAt },
      durable.cancelRequest
        ? { $set: { request_status: 'cancelled', cancelled_at: durable.operation_now, updatedAt: durable.operation_now } }
        : { $set: { request_status: 'waiting', updatedAt: durable.operation_now }, $unset: { cancelled_at: '', fulfilled_at: '' } },
      (current) => current.request_status === (durable.cancelRequest ? 'cancelled' : 'waiting') && sameDate(current.updatedAt, durable.operation_now),
      { session }));
    await journal.step('event_inserted', () => appendStorageEvent({
      id: `${durable.operation_id}:event`, entityType: 'storageMove', entityId: moveId,
      eventType: 'manual_move_cancelled', actorType: 'administrator', actor: durable.operation_actor,
      occurredAt: durable.operation_now, reason: durable.explanation,
      details: { request_returned_to_queue: !durable.cancelRequest },
    }, { session }));
    return true;
  });
};

export const confirmStorageClearanceManual = async ({ unitId, actor, commandId, now = new Date() }) => {
  const id = manualOperationId('clearance.confirm', actor, commandId);
  const prior = id ? await StorageActionExecutions.findOneAsync(id) : null;
  const unit = prior?.operation_payload?.unit || await StorageUnits.findOneAsync(unitId);
  if (!unit || (!prior && unit.availability_status !== 'awaiting_clearance')) {
    throw new Meteor.Error('bad-state', 'Unit is not awaiting clearance');
  }
  return runManualOperation({
    kind: 'clearance.confirm', targetType: 'storageUnit', targetId: unitId,
    actor, commandId, payload: prior?.operation_payload || { unit }, intent: {}, now,
  }, async (journal, payload, session) => {
    await journal.step('unit_available', () => ensureStorageUpdate(StorageUnits, unitId,
      { availability_status: 'awaiting_clearance', updatedAt: payload.unit.updatedAt },
      { $set: { availability_status: 'available', updatedAt: payload.operation_now }, $unset: { owner: '' } },
      (current) => current.availability_status === 'available' && !current.owner && sameDate(current.updatedAt, payload.operation_now),
      { session }));
    await journal.step('event_inserted', () => appendStorageEvent({
      id: `${payload.operation_id}:event`,
      entityType: 'storageUnit', entityId: unitId, eventType: 'manual_physical_clearance_confirmed',
      actorType: 'administrator', actor: payload.operation_actor, occurredAt: payload.operation_now,
    }, { session }));
    return true;
  });
};
