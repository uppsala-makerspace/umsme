import { Meteor } from 'meteor/meteor';
import { Members } from '/imports/common/collections/members';
import {
  StorageWalls, StorageUnits, StorageRequests, StorageOffers, StorageEvents,
} from '/imports/common/collections/storage';
import { hasActiveLabMembershipAt } from '/imports/common/lib/storageRules';
import { STORAGE_SCHEMAS, validateStorageDocument } from './db';
import { appendStorageEvent } from './events';
import { completeStorageMove } from './commands';
import { reconcileStorageState } from './reconciliation';
import { storageOwnerForMember } from './access';
import { storageOperationId } from './ids';

const requiredReason = (reason) => {
  const value = String(reason || '').trim();
  if (!value) throw new Meteor.Error('missing-reason', 'A reason is required');
  return value;
};
const allowedWallFields = ['name', 'floor', 'display_order', 'column_count', 'row_count', 'note', 'active'];
const allowedUnitFields = ['name', 'height', 'wall_id', 'column', 'row', 'availability_status', 'note'];
const operationId = (kind, actor, commandId, target = '') =>
  storageOperationId('manual', kind, actor, commandId || target);
const priorOperation = (id) => StorageEvents.findOneAsync(id);

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

const event = (id, input) => appendStorageEvent({ id, actorType: 'administrator', ...input });

export const createStorageWallManual = async ({ fields, actor, commandId, now = new Date() }) => {
  const id = operationId('wall.create', actor, commandId);
  const prior = await priorOperation(id);
  if (prior) return prior.entity_id;
  const wallId = `${id}:wall`;
  const doc = {
    _id: wallId,
    ...Object.fromEntries(allowedWallFields.filter((key) => fields[key] !== undefined).map((key) => [key, fields[key]])),
    active: fields.active === undefined ? true : fields.active,
    createdAt: now, updatedAt: now,
  };
  validateStorageDocument(STORAGE_SCHEMAS.wall, doc);
  await StorageWalls.insertAsync(doc);
  await event(id, {
    entityType: 'storageWall', entityId: wallId, eventType: 'wall_created', actor, occurredAt: now,
  });
  return wallId;
};

export const updateStorageWallManual = async ({ wallId, fields, actor, commandId, now = new Date() }) => {
  const id = operationId('wall.update', actor, commandId, wallId);
  if (await priorOperation(id)) return true;
  const wall = await StorageWalls.findOneAsync(wallId);
  if (!wall) throw new Meteor.Error('not-found', 'Storage wall not found');
  const changes = Object.fromEntries(allowedWallFields.filter((key) => fields[key] !== undefined).map((key) => [key, fields[key]]));
  const candidate = { ...wall, ...changes, updatedAt: now };
  if (!candidate.note) delete candidate.note;
  validateStorageDocument(STORAGE_SCHEMAS.wall, candidate);
  if (fields.floor !== undefined && fields.floor !== wall.floor && await StorageUnits.findOneAsync({ wall_id: wallId })) {
    throw new Meteor.Error('wall-not-empty', 'Move all units before changing the wall floor');
  }
  const columnCount = fields.column_count ?? wall.column_count;
  const rowCount = fields.row_count ?? wall.row_count;
  if (await StorageUnits.findOneAsync({
    wall_id: wallId, $or: [{ column: { $gt: columnCount } }, { row: { $gt: rowCount } }],
  })) throw new Meteor.Error('wall-layout-in-use', 'The smaller wall layout would exclude existing units');
  const $set = { updatedAt: now };
  const $unset = {};
  for (const key of allowedWallFields) {
    if (fields[key] === undefined) continue;
    if (key === 'note' && !fields[key]) $unset[key] = '';
    else $set[key] = fields[key];
  }
  const changed = await StorageWalls.updateAsync({ _id: wallId, updatedAt: wall.updatedAt }, {
    $set, ...(Object.keys($unset).length ? { $unset } : {}),
  });
  if (!changed) throw new Meteor.Error('storage-conflict', 'The wall changed. Reload and try again.');
  await event(id, {
    entityType: 'storageWall', entityId: wallId, eventType: 'wall_updated', actor, occurredAt: now,
    details: { changed_fields: Object.keys(changes) },
  });
  return true;
};

export const createStorageUnitManual = async ({ fields, actor, commandId, now = new Date() }) => {
  if (fields.owner !== undefined) throw new Meteor.Error('bad-field', 'New storage units cannot have an owner');
  if (fields.availability_status !== undefined && !['available', 'unavailable'].includes(fields.availability_status)) {
    throw new Meteor.Error('bad-state', 'New storage units must be available or unavailable');
  }
  const id = operationId('unit.create', actor, commandId);
  const prior = await priorOperation(id);
  if (prior) return prior.entity_id;
  const wall = await storageWallLocation({
    wallId: fields.wall_id, column: fields.column, row: fields.row, requireActive: true,
  });
  const unitId = `${id}:unit`;
  const doc = {
    _id: unitId,
    ...Object.fromEntries(allowedUnitFields.filter((key) => fields[key] !== undefined).map((key) => [key, fields[key]])),
    floor: wall.floor, availability_status: fields.availability_status || 'available',
    createdAt: now, updatedAt: now,
  };
  validateStorageDocument(STORAGE_SCHEMAS.unit, doc);
  await StorageUnits.insertAsync(doc);
  await event(id, {
    entityType: 'storageUnit', entityId: unitId, eventType: 'unit_created', actor, unit: unitId, occurredAt: now,
  });
  return unitId;
};

export const updateStorageUnitManual = async ({ unitId, fields, actor, commandId, acknowledged = false, now = new Date() }) => {
  const id = operationId('unit.update', actor, commandId, unitId);
  if (await priorOperation(id)) return true;
  const unit = await StorageUnits.findOneAsync(unitId);
  if (!unit) throw new Meteor.Error('not-found', 'Storage unit not found');
  const changes = Object.fromEntries(allowedUnitFields.filter((key) => fields[key] !== undefined).map((key) => [key, fields[key]]));
  const metadataChanged = ['name', 'height', 'wall_id', 'column', 'row']
    .some((key) => fields[key] !== undefined && fields[key] !== unit[key]);
  if (metadataChanged && ['occupied', 'reserved'].includes(unit.availability_status) && !acknowledged) {
    throw new Meteor.Error('acknowledgement-required', 'Confirm metadata changes to an occupied or reserved unit');
  }
  if (fields.owner !== undefined) throw new Meteor.Error('bad-field', 'Owner changes require an assignment operation');
  if (fields.availability_status !== undefined && fields.availability_status !== unit.availability_status &&
      (unit.owner || !['available', 'unavailable'].includes(fields.availability_status))) {
    throw new Meteor.Error('bad-state', 'Lifecycle availability changes require their dedicated operation');
  }
  const wall = await storageWallLocation({
    wallId: fields.wall_id ?? unit.wall_id, column: fields.column ?? unit.column,
    row: fields.row ?? unit.row, requireActive: fields.wall_id !== undefined && fields.wall_id !== unit.wall_id,
  });
  const candidate = { ...unit, ...changes, floor: wall.floor, updatedAt: now };
  if (!candidate.height) delete candidate.height;
  if (!candidate.note) delete candidate.note;
  validateStorageDocument(STORAGE_SCHEMAS.unit, candidate);
  const $set = { updatedAt: now, floor: wall.floor };
  const $unset = {};
  for (const key of allowedUnitFields) {
    if (fields[key] === undefined) continue;
    if (['height', 'note'].includes(key) && !fields[key]) $unset[key] = '';
    else $set[key] = fields[key];
  }
  const changed = await StorageUnits.updateAsync({ _id: unitId, updatedAt: unit.updatedAt }, {
    $set, ...(Object.keys($unset).length ? { $unset } : {}),
  });
  if (!changed) throw new Meteor.Error('storage-conflict', 'The unit changed. Reload and try again.');
  await event(id, {
    entityType: 'storageUnit', entityId: unitId, eventType: 'unit_updated', actor, unit: unitId,
    member: unit.owner, occurredAt: now, details: { changed_fields: Object.keys(changes) },
  });
  return true;
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
  const id = operationId('assignment.create', actor, commandId, unitId);
  if (await priorOperation(id)) return unitId;
  await reconcileStorageState({ now });
  const selectedOwner = await Members.findOneAsync(ownerId);
  if (!selectedOwner) throw new Meteor.Error('not-found', 'Member not found');
  const owner = await storageOwnerForMember(selectedOwner);
  const unit = await StorageUnits.findOneAsync(unitId);
  if (!unit || unit.availability_status !== 'available' || unit.owner) {
    throw new Meteor.Error('bad-state', 'Storage unit is not available');
  }
  if (await StorageUnits.findOneAsync({ owner: owner._id, availability_status: 'occupied' })) {
    throw new Meteor.Error('bad-state', 'Member already has storage');
  }
  const eligible = hasActiveLabMembershipAt(owner, now);
  const explanation = override ? requiredReason(reason) : undefined;
  if (!eligible && !override) throw new Meteor.Error('not-eligible', 'Active lab membership required');
  const request = await StorageRequests.findOneAsync({
    owner: owner._id, request_status: { $in: ['waiting', 'paused_ineligible'] }, request_type: 'allocation',
  });
  const changed = await StorageUnits.updateAsync(
    { _id: unitId, availability_status: 'available', owner: { $exists: false }, updatedAt: unit.updatedAt },
    { $set: {
      availability_status: 'occupied', owner: owner._id, assigned_at: now, assigned_by: actor,
      ...(request ? { assignment_request: request._id } : {}), updatedAt: now,
    } },
  );
  if (!changed) throw new Meteor.Error('storage-conflict', 'The unit changed. Reload and try again.');
  if (request) await StorageRequests.updateAsync(request._id, {
    $set: { request_status: 'fulfilled', fulfilled_at: now, updatedAt: now },
  });
  await event(id, {
    entityType: 'storageUnit', entityId: unitId, eventType: 'manual_assignment_created',
    actor, member: owner._id, unit: unitId, occurredAt: now, reason: explanation,
    details: { request: request?._id, eligibility_override: override },
  });
  return unitId;
};

export const endStorageAssignmentManual = async ({ assignmentId, actor, reason, commandId, now = new Date() }) => {
  const explanation = requiredReason(reason);
  const id = operationId('assignment.end', actor, commandId, assignmentId);
  if (await priorOperation(id)) return true;
  const unit = await StorageUnits.findOneAsync(assignmentId);
  if (!unit || unit.availability_status !== 'occupied' || !unit.owner) {
    throw new Meteor.Error('bad-state', 'Active assignment not found');
  }
  const changed = await StorageUnits.updateAsync(
    { _id: unit._id, availability_status: 'occupied', owner: unit.owner, updatedAt: unit.updatedAt },
    { $set: { availability_status: 'awaiting_clearance', updatedAt: now }, $unset: { warning: '', exemption: '' } },
  );
  if (!changed) throw new Meteor.Error('storage-conflict', 'The unit changed. Reload and try again.');
  await event(id, {
    entityType: 'storageUnit', entityId: unit._id, eventType: 'manual_assignment_ended',
    actor, member: unit.owner, unit: unit._id, occurredAt: now, reason: explanation,
  });
  return true;
};

export const createStorageExemptionManual = async ({ assignmentId, actor, reason, exemptUntil, commandId, now = new Date() }) => {
  const explanation = requiredReason(reason);
  const id = operationId('exemption.create', actor, commandId, assignmentId);
  if (await priorOperation(id)) return assignmentId;
  await reconcileStorageState({ now });
  const unit = await StorageUnits.findOneAsync(assignmentId);
  if (!unit || unit.availability_status !== 'occupied') throw new Meteor.Error('bad-state', 'Active assignment not found');
  if (unit.exemption) throw new Meteor.Error('bad-state', 'An active exemption already exists');
  const until = exemptUntil ? new Date(exemptUntil) : undefined;
  if (until && (Number.isNaN(until.getTime()) || until <= now)) throw new Meteor.Error('bad-date', 'Exemption expiry must be in the future');
  const exemption = {
    reason: explanation, ...(until ? { exempt_until: until } : {}), created_at: now, created_by: actor,
  };
  const changed = await StorageUnits.updateAsync(
    { _id: unit._id, availability_status: 'occupied', exemption: { $exists: false }, updatedAt: unit.updatedAt },
    { $set: { exemption, updatedAt: now } },
  );
  if (!changed) throw new Meteor.Error('storage-conflict', 'The unit changed. Reload and try again.');
  await event(id, {
    entityType: 'storageUnit', entityId: unit._id, eventType: 'exemption_created', actor,
    member: unit.owner, unit: unit._id, occurredAt: now, reason: explanation,
    details: { exempt_until: until },
  });
  return unit._id;
};

export const revokeStorageExemptionManual = async ({ exemptionId, actor, commandId, now = new Date() }) => {
  const id = operationId('exemption.revoke', actor, commandId, exemptionId);
  if (await priorOperation(id)) return true;
  const unit = await StorageUnits.findOneAsync(exemptionId);
  if (!unit?.exemption) throw new Meteor.Error('bad-state', 'Active exemption not found');
  const changed = await StorageUnits.updateAsync(
    { _id: unit._id, 'exemption.created_at': unit.exemption.created_at, updatedAt: unit.updatedAt },
    { $unset: { exemption: '' }, $set: { updatedAt: now } },
  );
  if (!changed) throw new Meteor.Error('storage-conflict', 'The unit changed. Reload and try again.');
  await event(id, {
    entityType: 'storageUnit', entityId: unit._id, eventType: 'exemption_revoked', actor,
    member: unit.owner, unit: unit._id, occurredAt: now,
  });
  return true;
};

export const completeStorageMoveManual = ({ moveId, actor }) =>
  completeStorageMove({ moveId, actor, actorType: 'administrator' });

export const upsertStorageRequestManual = async ({
  ownerId, requestId, requestType, preference, requestedAt, actor, reason, commandId, now = new Date(),
}) => {
  if (!['allocation', 'move', 'release'].includes(requestType)) throw new Meteor.Error('bad-request-type', 'Invalid storage request type');
  const selectedOwner = await Members.findOneAsync(ownerId);
  if (!selectedOwner) throw new Meteor.Error('not-found', 'Member not found');
  const owner = await storageOwnerForMember(selectedOwner);
  const unit = await StorageUnits.findOneAsync({ owner: owner._id, availability_status: 'occupied' });
  if (requestType === 'allocation' && unit) throw new Meteor.Error('bad-state', 'A member with storage must request a move or release');
  if (requestType !== 'allocation' && !unit) throw new Meteor.Error('bad-state', 'Move and release requests require an active assignment');
  const existing = requestId ? await StorageRequests.findOneAsync(requestId) : await StorageRequests.findOneAsync({
    owner: owner._id, request_status: { $in: ['waiting', 'paused_ineligible', 'in_progress'] },
  });
  if (requestId && !existing) throw new Meteor.Error('not-found', 'Storage request not found');
  if (existing && existing.owner !== owner._id) throw new Meteor.Error('not-authorized', 'Request belongs to another storage owner');
  if (existing && !['waiting', 'paused_ineligible'].includes(existing.request_status)) throw new Meteor.Error('bad-state', 'Request cannot be edited');
  const queueDate = requestedAt ? new Date(requestedAt) : (existing?.requested_at || now);
  if (Number.isNaN(queueDate.getTime())) throw new Meteor.Error('bad-date', 'Invalid queue date');
  if (requestedAt && (!existing || queueDate.getTime() !== existing.requested_at.getTime())) requiredReason(reason);
  const normalizedPreference = requestType === 'release' ? undefined : (preference || undefined);
  if (requestType === 'move' && !normalizedPreference) throw new Meteor.Error('bad-preference', 'A move request needs a preference');
  const id = operationId('request.upsert', actor, commandId, existing?._id || owner._id);
  const prior = await priorOperation(id);
  if (prior) return prior.entity_id;
  const targetId = existing?._id || `${id}:request`;
  const status = requestType === 'release' || hasActiveLabMembershipAt(owner, now) ? 'waiting' : 'paused_ineligible';
  if (existing) {
    const $set = {
      request_type: requestType, requested_at: queueDate, request_status: status, updatedAt: now,
      ...(normalizedPreference ? { preference: normalizedPreference } : {}), ...(unit ? { source_unit: unit._id } : {}),
    };
    const $unset = {};
    if (!normalizedPreference) $unset.preference = '';
    if (!unit) $unset.source_unit = '';
    const changed = await StorageRequests.updateAsync({ _id: targetId, updatedAt: existing.updatedAt }, {
      $set, ...(Object.keys($unset).length ? { $unset } : {}),
    });
    if (!changed) throw new Meteor.Error('storage-conflict', 'The request changed. Reload and try again.');
  } else {
    await StorageRequests.insertAsync({
      _id: targetId, owner: owner._id, request_type: requestType, requested_at: queueDate,
      ...(normalizedPreference ? { preference: normalizedPreference } : {}),
      ...(unit ? { source_unit: unit._id } : {}), request_status: status, createdAt: now, updatedAt: now,
    });
  }
  await event(id, {
    entityType: 'storageRequest', entityId: targetId,
    eventType: existing ? 'manual_request_updated' : 'manual_request_created',
    actor, member: owner._id, unit: unit?._id, occurredAt: now, reason,
  });
  return targetId;
};

export const cancelStorageRequestManual = async ({ requestId, actor, reason, commandId, now = new Date() }) => {
  const explanation = requiredReason(reason);
  const id = operationId('request.cancel', actor, commandId, requestId);
  if (await priorOperation(id)) return true;
  const request = await StorageRequests.findOneAsync(requestId);
  if (!request || !['waiting', 'paused_ineligible'].includes(request.request_status)) {
    throw new Meteor.Error('bad-state', 'Active editable request not found');
  }
  const changed = await StorageRequests.updateAsync({ _id: requestId, updatedAt: request.updatedAt },
    { $set: { request_status: 'cancelled', cancelled_at: now, updatedAt: now } });
  if (!changed) throw new Meteor.Error('storage-conflict', 'The request changed. Reload and try again.');
  await event(id, {
    entityType: 'storageRequest', entityId: requestId, eventType: 'manual_request_cancelled',
    actor, member: request.owner, unit: request.source_unit, occurredAt: now, reason: explanation,
  });
  return true;
};

export const setStorageRequestPausedManual = async ({ requestId, paused, actor, reason, commandId, now = new Date() }) => {
  const explanation = requiredReason(reason);
  const id = operationId('request.pause', actor, commandId, requestId);
  if (await priorOperation(id)) return true;
  const request = await StorageRequests.findOneAsync(requestId);
  if (!request || !['waiting', 'paused_ineligible'].includes(request.request_status)) {
    throw new Meteor.Error('bad-state', 'Active editable request not found');
  }
  if (request.request_type === 'release') throw new Meteor.Error('bad-state', 'Release requests do not depend on lab eligibility');
  const owner = await Members.findOneAsync(request.owner);
  const eligible = hasActiveLabMembershipAt(owner, now);
  if (paused === eligible) throw new Meteor.Error('bad-state', paused ? 'An eligible request cannot be marked ineligible' : 'Active lab membership is required to resume');
  const wanted = paused ? 'paused_ineligible' : 'waiting';
  if (request.request_status !== wanted) {
    const changed = await StorageRequests.updateAsync(
      { _id: requestId, request_status: request.request_status, updatedAt: request.updatedAt },
      { $set: { request_status: wanted, updatedAt: now } },
    );
    if (!changed) throw new Meteor.Error('storage-conflict', 'The request changed. Reload and try again.');
  }
  await event(id, {
    entityType: 'storageRequest', entityId: requestId,
    eventType: paused ? 'manual_request_paused' : 'manual_request_resumed',
    actor, member: request.owner, unit: request.source_unit, occurredAt: now, reason: explanation,
    details: { requested_at_preserved: request.requested_at },
  });
  return true;
};

export const extendStorageMoveManual = async ({ moveId, extendTo, actor, reason, commandId, now = new Date() }) => {
  const explanation = requiredReason(reason);
  const deadline = new Date(extendTo);
  if (Number.isNaN(deadline.getTime()) || deadline <= now) throw new Meteor.Error('bad-date', 'Deadline must be in the future');
  const id = operationId('offer.extend', actor, commandId, moveId);
  if (await priorOperation(id)) return true;
  const offer = await StorageOffers.findOneAsync(moveId);
  if (!offer) throw new Meteor.Error('bad-state', 'Pending move not found');
  const changed = await StorageOffers.updateAsync({ _id: moveId, updatedAt: offer.updatedAt },
    { $set: { deadline_at: deadline, updatedAt: now } });
  if (!changed) throw new Meteor.Error('storage-conflict', 'The offer changed. Reload and try again.');
  await event(id, {
    entityType: 'storageOffer', entityId: moveId, eventType: 'manual_move_extended', actor,
    member: offer.owner, unit: offer.to_unit, relatedUnit: offer.from_unit,
    occurredAt: now, reason: explanation, details: { deadline_at: deadline },
  });
  return true;
};

export const cancelStorageMoveManual = async ({ moveId, actor, reason, cancelRequest = false, commandId, now = new Date() }) => {
  const explanation = requiredReason(reason);
  const id = operationId('offer.cancel', actor, commandId, moveId);
  if (await priorOperation(id)) return true;
  const offer = await StorageOffers.findOneAsync(moveId);
  if (!offer) throw new Meteor.Error('bad-state', 'Pending move not found');
  const [unit, request] = await Promise.all([
    StorageUnits.findOneAsync(offer.to_unit), StorageRequests.findOneAsync(offer.request),
  ]);
  if (!unit || !request) throw new Meteor.Error('not-found', 'Move references are missing');
  const released = await StorageUnits.updateAsync(
    { _id: unit._id, availability_status: 'reserved', owner: offer.owner, updatedAt: unit.updatedAt },
    { $set: { availability_status: 'available', updatedAt: now }, $unset: { owner: '' } },
  );
  if (!released) throw new Meteor.Error('storage-conflict', 'The destination changed. Reload and try again.');
  await StorageRequests.updateAsync(request._id, cancelRequest
    ? { $set: { request_status: 'cancelled', cancelled_at: now, updatedAt: now } }
    : { $set: { request_status: 'waiting', updatedAt: now }, $unset: { cancelled_at: '', fulfilled_at: '' } });
  await StorageOffers.removeAsync(offer._id);
  await event(id, {
    entityType: 'storageOffer', entityId: moveId, eventType: 'manual_move_cancelled', actor,
    member: offer.owner, unit: offer.to_unit, relatedUnit: offer.from_unit,
    occurredAt: now, reason: explanation, details: { request_returned_to_queue: !cancelRequest },
  });
  return true;
};

export const confirmStorageClearanceManual = async ({ unitId, actor, commandId, now = new Date() }) => {
  const id = operationId('clearance.confirm', actor, commandId, unitId);
  if (await priorOperation(id)) return true;
  const unit = await StorageUnits.findOneAsync(unitId);
  if (!unit || unit.availability_status !== 'awaiting_clearance') {
    throw new Meteor.Error('bad-state', 'Unit is not awaiting clearance');
  }
  const changed = await StorageUnits.updateAsync({ _id: unitId, availability_status: 'awaiting_clearance', updatedAt: unit.updatedAt }, {
    $set: { availability_status: 'available', updatedAt: now },
    $unset: { owner: '', assigned_at: '', assigned_by: '', assignment_request: '', warning: '', exemption: '' },
  });
  if (!changed) throw new Meteor.Error('storage-conflict', 'The unit changed. Reload and try again.');
  await event(id, {
    entityType: 'storageUnit', entityId: unitId, eventType: 'manual_physical_clearance_confirmed',
    actor, member: unit.owner, unit: unitId, occurredAt: now,
  });
  return true;
};
