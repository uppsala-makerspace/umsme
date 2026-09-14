import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import {
  StorageRequests,
  StorageAssignments,
  StorageMoves,
  StorageActionExecutions,
} from '/imports/common/collections/storage';
import { hasActiveLabMembershipAt } from '/imports/common/lib/storageRules';
import { STORAGE_SCHEMAS, casStorageUpdate, insertStorageDocument } from './db';
import { appendStorageEvent } from './events';
import { completeStorageMove } from './commands';
import { reconcileStorageState } from './reconciliation';
import { runStorageAtomic } from './atomic';
import { ensureStorageDocument, ensureStorageUpdate } from './effects';
import { journaledStorageOperation, storageOperationId } from './journal';

const cleanPreference = (preference) => {
  if (preference === undefined || preference === null) return undefined;
  if (typeof preference !== 'object' || Array.isArray(preference)) {
    throw new Meteor.Error('bad-preference', 'Preference must be an object');
  }
  const clean = {};
  if (preference.floor !== undefined) {
    if (!['floor1', 'floor2'].includes(preference.floor)) throw new Meteor.Error('bad-preference', 'Invalid floor');
    clean.floor = preference.floor;
  }
  if (preference.height !== undefined) {
    if (!['low', 'high'].includes(preference.height)) throw new Meteor.Error('bad-preference', 'Invalid height');
    clean.height = preference.height;
  }
  return Object.keys(clean).length ? clean : undefined;
};

export const upsertMemberStorageRequest = async ({ owner, requestType, preference, actor, commandId, now = new Date() }) => {
  if (!['allocation', 'move', 'release'].includes(requestType)) {
    throw new Meteor.Error('bad-request-type', 'Invalid storage request type');
  }
  const normalizedPreference = requestType === 'release' ? undefined : cleanPreference(preference);
  if (requestType === 'move' && !normalizedPreference) {
    throw new Meteor.Error('bad-preference', 'A move request needs a preference');
  }
  const callerIntent = {
    kind: 'member.request.upsert', actor, owner: owner._id,
    request_type: requestType, preference: normalizedPreference,
  };
  const operationId = commandId && storageOperationId('member.request.upsert', actor, owner._id, commandId);
  const prior = operationId ? await StorageActionExecutions.findOneAsync(operationId) : null;
  if (prior) {
    const payload = prior.operation_payload;
    const payloadOwner = payload.document?.owner || payload.existing?.owner;
    if (payload.actor !== actor || payloadOwner !== owner._id) {
      throw new Meteor.Error('not-authorized', 'Storage command belongs to another member');
    }
    const run = (session) => journaledStorageOperation({
      id: operationId, commandId, actionType: 'member', kind: 'member.request.upsert',
      targetType: 'storageRequest', targetId: payload.requestId, actor: payload.actor,
      payload, callerIntent, now: payload.now,
    }, (journal) => executeMemberRequestUpsert(journal, payload, session), { session });
    return runStorageAtomic({ transactional: run, fallback: () => run() });
  }
  await reconcileStorageState({ ownerIds: [owner._id], now });
  const assignment = await StorageAssignments.findOneAsync({ owner: owner._id, ended_at: { $exists: false } });
  if (requestType === 'allocation' && assignment) {
    throw new Meteor.Error('bad-state', 'A member with storage must request a move or release');
  }
  if ((requestType === 'move' || requestType === 'release') && !assignment) {
    throw new Meteor.Error('bad-state', 'No active storage assignment');
  }
  if (requestType !== 'release' && !hasActiveLabMembershipAt(owner, now)) {
    throw new Meteor.Error('not-eligible', 'Active lab membership required');
  }
  const existing = await StorageRequests.findOneAsync({
    owner: owner._id,
    request_status: { $in: ['waiting', 'paused_ineligible', 'in_progress'] },
  });
  if (existing?.request_status === 'in_progress') {
    throw new Meteor.Error('bad-state', 'A pending move cannot be edited');
  }
  let payload;
  if (existing) {
    const $set = {
      request_type: requestType,
      request_status: 'waiting',
      updatedAt: now,
      ...(assignment ? { source_assignment: assignment._id } : {}),
      ...(normalizedPreference ? { preference: normalizedPreference } : {}),
    };
    const $unset = {};
    if (!assignment) $unset.source_assignment = '';
    if (!normalizedPreference) $unset.preference = '';
    payload = {
      mode: 'update', requestId: existing._id, existing,
      modifier: { $set, ...(Object.keys($unset).length ? { $unset } : {}) },
      actor, now, requestType, normalizedPreference,
    };
  } else {
    const requestId = operationId ? `${operationId}:request` : Random.id();
    payload = {
      mode: 'insert', requestId, actor, now, requestType, normalizedPreference,
      document: {
        _id: requestId, owner: owner._id, request_type: requestType, requested_at: now,
        ...(normalizedPreference ? { preference: normalizedPreference } : {}),
        ...(assignment ? { source_assignment: assignment._id } : {}),
        request_status: 'waiting', createdAt: now, updatedAt: now,
      },
    };
  }
  const id = operationId || storageOperationId('member.request.upsert', actor, payload.requestId, now.toISOString());
  const run = (session) => journaledStorageOperation({
    id, commandId: commandId || id, actionType: 'member', kind: 'member.request.upsert',
    targetType: 'storageRequest', targetId: payload.requestId, actor, payload, callerIntent, now,
  }, (journal) => executeMemberRequestUpsert(journal, payload, session), { session });
  return runStorageAtomic({ transactional: run, fallback: () => run() });
};

const executeMemberRequestUpsert = async (journal, payload, session) => {
  if (payload.mode === 'insert') {
    await journal.step('request_written', () => ensureStorageDocument(
      StorageRequests, STORAGE_SCHEMAS.request, payload.document,
      { session, matches: (current) => current.owner === payload.document.owner },
    ));
  } else {
    await journal.step('request_written', () => ensureStorageUpdate(
      StorageRequests, payload.requestId,
      { request_status: payload.existing.request_status, updatedAt: payload.existing.updatedAt },
      payload.modifier,
      (current) => current.updatedAt?.getTime() === payload.now.getTime(), { session },
    ));
  }
  await journal.step('event_inserted', () => appendStorageEvent({
    id: `${journal.operation._id}:event`,
    entityType: 'storageRequest', entityId: payload.requestId,
    eventType: payload.mode === 'insert' ? 'request_created' : 'request_updated',
    actorType: 'member', actor: payload.actor, occurredAt: payload.now,
    details: { request_type: payload.requestType, preference: payload.normalizedPreference },
  }, { session }));
  return payload.requestId;
};

export const cancelMemberStorageRequest = async ({ owner, requestId, actor, commandId, now = new Date() }) => {
  const id = commandId
    ? storageOperationId('member.request.cancel', actor, owner._id, commandId)
    : storageOperationId('member.request.cancel', actor, owner._id, requestId);
  const prior = await StorageActionExecutions.findOneAsync(id);
  const request = prior?.operation_payload?.request || await StorageRequests.findOneAsync(requestId);
  if (!request || request.owner !== owner._id) throw new Meteor.Error('not-found', 'Request not found');
  if (!prior && !['waiting', 'paused_ineligible'].includes(request.request_status)) {
    throw new Meteor.Error('bad-state', 'This request cannot be cancelled');
  }
  const payload = prior?.operation_payload || { request, actor, now };
  if (payload.actor !== actor || payload.request.owner !== owner._id) {
    throw new Meteor.Error('not-authorized', 'Storage command belongs to another member');
  }
  const run = (session) => journaledStorageOperation({
    id, commandId: commandId || id, actionType: 'member', kind: 'member.request.cancel',
    targetType: 'storageRequest', targetId: requestId, actor, payload,
    callerIntent: { kind: 'member.request.cancel', actor, owner: owner._id, request_id: requestId },
    now: payload.now,
  }, async (journal) => {
    await journal.step('request_cancelled', () => ensureStorageUpdate(StorageRequests, requestId,
      { request_status: payload.request.request_status, updatedAt: payload.request.updatedAt },
      { $set: { request_status: 'cancelled', cancelled_at: payload.now, updatedAt: payload.now } },
      (current) => current.request_status === 'cancelled' && current.cancelled_at?.getTime() === payload.now.getTime(),
      { session }));
    await journal.step('event_inserted', () => appendStorageEvent({
      id: `${id}:event`, entityType: 'storageRequest', entityId: requestId, eventType: 'request_cancelled',
      actorType: 'member', actor: payload.actor, occurredAt: payload.now,
    }, { session }));
    return true;
  }, { session });
  return runStorageAtomic({ transactional: run, fallback: () => run() });
};

export const confirmMemberStorageMove = async ({ owner, moveId, actor }) => {
  const move = await StorageMoves.findOneAsync(moveId);
  if (!move || move.owner !== owner._id) throw new Meteor.Error('not-found', 'Move not found');
  return completeStorageMove({ moveId, actor, actorType: 'member' });
};
