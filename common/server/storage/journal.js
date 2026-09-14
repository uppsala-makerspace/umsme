import crypto from 'node:crypto';
import { Random } from 'meteor/random';
import { StorageActionExecutions } from '/imports/common/collections/storage';
import { stableStorageMigrationString } from '/imports/common/lib/legacyStorageMigrationFingerprint';
import { STORAGE_SCHEMAS, insertStorageDocument } from './db';
import { isDuplicateKeyError, StorageConflictError } from './errors';

const LEASE_MS = 60_000;
let failureInjector;

const hash = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');
export const storageOperationId = (...parts) => hash(parts.join(':')).slice(0, 32);
const payloadHash = (payload) => hash(stableStorageMigrationString(payload));
export const storageCallerIntentHash = (intent) => payloadHash(intent);
const encodeResult = (result) => (result && typeof result === 'object'
  ? result
  : { __storage_journal_scalar: true, value: result });
const decodeResult = (result) => (result?.__storage_journal_scalar ? result.value : result);

const updateOne = async (selector, modifier, session) => {
  if (session) return StorageActionExecutions.rawCollection().updateOne(selector, modifier, { session });
  const count = await StorageActionExecutions.updateAsync(selector, modifier);
  return { matchedCount: count };
};

const findOne = (id, session) => session
  ? StorageActionExecutions.rawCollection().findOne({ _id: id }, { session })
  : StorageActionExecutions.findOneAsync(id);

export const ensureStorageOperation = async ({
  id, commandId = id, suggestionId = id, actionType, kind, targetType, targetId,
  actor, payload, callerIntent, now = new Date(), session,
}) => {
  const expectedHash = payloadHash(payload);
  const expectedIntentHash = storageCallerIntentHash(callerIntent || {
    kind, actor, target_type: targetType, target_id: targetId,
  });
  try {
    await insertStorageDocument(StorageActionExecutions, STORAGE_SCHEMAS.actionExecution, {
      _id: id,
      command_id: commandId,
      suggestion_id: suggestionId,
      action_type: actionType,
      target_type: targetType,
      target_id: targetId,
      execution_status: 'failed',
      attempts: 0,
      operation_kind: kind,
      payload_hash: expectedHash,
      caller_intent_hash: expectedIntentHash,
      operation_payload: payload,
      completed_steps: [],
      created_by: actor,
      createdAt: now,
      updatedAt: now,
    }, { session });
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
  }
  const operation = await findOne(id, session);
  if (!operation || operation.payload_hash !== expectedHash ||
      operation.caller_intent_hash !== expectedIntentHash || operation.operation_kind !== kind ||
      operation.created_by !== actor) {
    throw new StorageConflictError('Idempotency key was already used for a different storage operation');
  }
  return operation;
};

export const runStorageOperation = async ({ operation, execute, session }) => {
  if (operation.execution_status === 'completed') return decodeResult(operation.result);
  const claimedAt = new Date();
  const lease = new Date(claimedAt.getTime() + LEASE_MS);
  const claimToken = Random.id();
  const claim = await updateOne({
    _id: operation._id,
    $or: [
      { execution_status: 'failed' },
      { execution_status: 'processing', lease_expires_at: { $lte: claimedAt } },
    ],
  }, {
    $set: {
      execution_status: 'processing', claim_token: claimToken, claimed_at: claimedAt,
      lease_expires_at: lease, updatedAt: claimedAt,
    },
    $inc: { attempts: 1 },
  }, session);
  if (claim.matchedCount !== 1) throw new StorageConflictError('Storage operation is already processing');

  const step = async (name, work) => {
    const current = await findOne(operation._id, session);
    if (current?.completed_steps?.includes(name)) return;
    await work();
    if (failureInjector) await failureInjector({ operation: current || operation, step: name, point: 'after_effect' });
    const marked = await updateOne({
      _id: operation._id, execution_status: 'processing', claim_token: claimToken,
    }, {
      $addToSet: { completed_steps: name },
      $set: { updatedAt: new Date() },
    }, session);
    if (marked.matchedCount !== 1) throw new StorageConflictError('Storage operation lease was lost');
    if (failureInjector) await failureInjector({ operation: current || operation, step: name, point: 'after_checkpoint' });
  };

  try {
    const result = await execute({ step, payload: operation.operation_payload, operation });
    const storedResult = encodeResult(result);
    const completedAt = new Date();
    const completed = await updateOne({
      _id: operation._id, execution_status: 'processing', claim_token: claimToken,
    }, {
      $set: { execution_status: 'completed', completed_at: completedAt, result: storedResult, updatedAt: completedAt },
      $unset: { lease_expires_at: '', claim_token: '', last_error: '' },
    }, session);
    if (completed.matchedCount !== 1) throw new StorageConflictError('Storage operation lease was lost');
    return result;
  } catch (error) {
    await updateOne({ _id: operation._id, claim_token: claimToken }, {
      $set: { execution_status: 'failed', last_error: error.message, updatedAt: new Date() },
      $unset: { lease_expires_at: '', claim_token: '' },
    }, session);
    throw error;
  }
};

export const journaledStorageOperation = async (spec, execute, { session } = {}) => {
  // The journal is intentionally established outside the domain transaction.
  // Besides making the intent durable before mutation, this avoids poisoning an
  // active Mongo transaction when an idempotent retry hits the unique key.
  const operation = await ensureStorageOperation({ ...spec, session: undefined });
  return runStorageOperation({ operation, execute, session });
};

export const setStorageJournalFailureInjectorForTests = (injector) => {
  failureInjector = injector;
};
