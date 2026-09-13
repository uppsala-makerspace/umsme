import assert from 'assert';
import { Members } from '/imports/common/collections/members';
import { Messages } from '/imports/common/collections/messages';
import {
  StorageWalls, StorageUnits, StorageRequests, StorageOffers, StorageEvents,
} from '/imports/common/collections/storage';
import { previewStorageSuggestions } from '/imports/common/server/storage/suggestions';
import { confirmStorageSuggestions, completeStorageMove } from '/imports/common/server/storage/commands';
import { reconcileStorageState } from '/imports/common/server/storage/reconciliation';
import {
  assignStorageUnitManual, createStorageExemptionManual, revokeStorageExemptionManual,
} from '/imports/common/server/storage/manual';
import { upsertMemberStorageRequest } from '/imports/common/server/storage/memberCommands';
import { storageMigrationFingerprint } from '/imports/common/lib/legacyStorageMigrationFingerprint';
import { STORAGE_CUTOVER_FINALIZED_ID, STORAGE_MIGRATION_SUMMARY_ID } from '/imports/common/server/storage/readiness';
import { setStorageNotificationTransportsForTests } from '/imports/common/server/storageMessages/service';

const prefix = 'storage-five-collection-test:';
const future = () => new Date(Date.now() + 365 * 86400000);
const past = () => new Date(Date.now() - 365 * 86400000);
const collections = [StorageWalls, StorageUnits, StorageRequests, StorageOffers, StorageEvents];

const cleanup = async () => {
  for (const collection of collections) await collection.removeAsync({});
  await Members.removeAsync({ _id: { $regex: `^${prefix}` } });
  await Messages.removeAsync({ member: { $regex: `^${prefix}` }, type: 'storage' });
};

const unit = (id, column, status = 'available', owner) => {
  const created = new Date();
  return StorageUnits.insertAsync({
    _id: id, name: id, floor: 'floor1', height: 'low', wall_id: `${prefix}wall`, column, row: 1,
    availability_status: status, ...(owner ? { owner } : {}),
    ...(owner && status === 'occupied' ? { assigned_at: created, assigned_by: `${prefix}admin` } : {}),
    createdAt: created, updatedAt: created,
  });
};

const installReadyMigration = async (created = new Date()) => {
  const documents = {
    storageWalls: [], storageUnits: [], storageRequests: [], storageOffers: [], storageEvents: [],
  };
  const payload = { version: 1, documents };
  const manifest = { ...payload, digest: storageMigrationFingerprint(payload) };
  const fingerprint = `${prefix}fingerprint`;
  await StorageEvents.insertAsync({
    _id: STORAGE_MIGRATION_SUMMARY_ID, entity_type: 'storageMigration', entity_id: 'legacy-storage-v1',
    event_type: 'legacy_storage_migration_applied', actor_type: 'administrator', actor: `${prefix}admin`,
    occurred_at: created, details: { fingerprint, manifest },
  });
  await StorageEvents.insertAsync({
    _id: STORAGE_CUTOVER_FINALIZED_ID, entity_type: 'storageMigration', entity_id: 'legacy-storage-v1',
    event_type: 'legacy_storage_cutover_finalized', actor_type: 'administrator', actor: `${prefix}admin`,
    occurred_at: created,
    details: { fingerprint, summary_event_id: STORAGE_MIGRATION_SUMMARY_ID, manifest_digest: manifest.digest },
  });
};

describe('five-collection storage database workflow', function () {
  beforeEach(async () => {
    setStorageNotificationTransportsForTests({ sendEmail: async () => {}, sendPush: async () => {} });
    await cleanup();
    const created = new Date();
    await StorageWalls.insertAsync({
      _id: `${prefix}wall`, name: `${prefix}wall`, floor: 'floor1', display_order: 1,
      column_count: 20, row_count: 2, active: true, createdAt: created, updatedAt: created,
    });
  });

  afterEach(async () => {
    setStorageNotificationTransportsForTests(undefined);
    await cleanup();
  });

  it('stores a confirmed assignment on the unit and remains idempotent through its event', async function () {
    const ownerId = `${prefix}assignment-owner`;
    const unitId = `${prefix}assignment-unit`;
    const requestId = `${prefix}assignment-request`;
    const created = new Date();
    await Members.insertAsync({ _id: ownerId, mid: 'five1', name: 'Assignment Owner', email: 'assignment@example.com', lab: future() });
    await unit(unitId, 1);
    await StorageRequests.insertAsync({
      _id: requestId, owner: ownerId, request_type: 'allocation', requested_at: created,
      request_status: 'waiting', createdAt: created, updatedAt: created,
    });
    await installReadyMigration(created);
    const preview = await previewStorageSuggestions('allocate');
    const command = {
      action: 'allocate', commandId: `${prefix}assignment-command`, actor: `${prefix}admin`,
      selections: [{ suggestion_id: preview.rows[0].suggestion_id }],
    };
    assert.strictEqual((await confirmStorageSuggestions(command)).results[0].status, 'applied');
    assert.strictEqual((await confirmStorageSuggestions(command)).results[0].status, 'already_applied');
    const stored = await StorageUnits.findOneAsync(unitId);
    assert.strictEqual(stored.owner, ownerId);
    assert.strictEqual(stored.availability_status, 'occupied');
    assert.strictEqual(stored.assignment_request, requestId);
    assert(stored.assigned_at instanceof Date);
    assert.strictEqual(await Messages.find({ member: ownerId, type: 'storage' }).countAsync(), 1);
  });

  it('embeds warnings and clears them when lab membership is renewed', async function () {
    const ownerId = `${prefix}warning-owner`;
    const unitId = `${prefix}warning-unit`;
    await Members.insertAsync({ _id: ownerId, mid: 'five2', name: 'Warning Owner', email: 'warning@example.com', lab: past() });
    await unit(unitId, 2, 'occupied', ownerId);
    const preview = await previewStorageSuggestions('warn');
    const result = await confirmStorageSuggestions({
      action: 'warn', commandId: `${prefix}warning-command`, actor: `${prefix}admin`,
      selections: [{ suggestion_id: preview.rows[0].suggestion_id }],
    });
    assert.strictEqual(result.results[0].status, 'applied');
    assert((await StorageUnits.findOneAsync(unitId)).warning.id);
    await Members.updateAsync(ownerId, { $set: { lab: future() } });
    await reconcileStorageState({ ownerIds: [ownerId] });
    assert.strictEqual((await StorageUnits.findOneAsync(unitId)).warning, undefined);
    assert(await StorageEvents.findOneAsync({ event_type: 'warning_resolved_renewal', unit: unitId }));
  });

  it('keeps only a pending move offer and records completion in events', async function () {
    const ownerId = `${prefix}move-owner`;
    const sourceId = `${prefix}move-source`;
    const destinationId = `${prefix}move-destination`;
    const requestId = `${prefix}move-request`;
    const created = new Date();
    await Members.insertAsync({ _id: ownerId, mid: 'five3', name: 'Move Owner', email: 'move@example.com', lab: future() });
    await unit(sourceId, 3, 'occupied', ownerId);
    await StorageUnits.updateAsync(sourceId, { $set: { height: 'high' } });
    await unit(destinationId, 4);
    await StorageRequests.insertAsync({
      _id: requestId, owner: ownerId, request_type: 'move', source_unit: sourceId,
      preference: { floor: 'floor1', height: 'low' }, requested_at: created,
      request_status: 'waiting', createdAt: created, updatedAt: created,
    });
    await installReadyMigration(created);
    const preview = await previewStorageSuggestions('allocate');
    const reservation = await confirmStorageSuggestions({
      action: 'allocate', commandId: `${prefix}move-command`, actor: `${prefix}admin`,
      selections: [{ suggestion_id: preview.rows[0].suggestion_id }],
    });
    const offerId = reservation.results[0].decision_id;
    assert(await StorageOffers.findOneAsync(offerId));
    await completeStorageMove({ moveId: offerId, actor: ownerId, actorType: 'member' });
    assert.strictEqual(await StorageOffers.findOneAsync(offerId), undefined);
    assert.strictEqual((await StorageUnits.findOneAsync(destinationId)).availability_status, 'occupied');
    assert.strictEqual((await StorageUnits.findOneAsync(sourceId)).availability_status, 'available');
    assert(await StorageEvents.findOneAsync({ entity_id: offerId, event_type: 'move_completed' }));
  });

  it('stores and removes an administrative exemption on the occupied unit', async function () {
    const ownerId = `${prefix}exemption-owner`;
    const unitId = `${prefix}exemption-unit`;
    await Members.insertAsync({ _id: ownerId, mid: 'five4', name: 'Exemption Owner', email: 'exemption@example.com', lab: future() });
    await unit(unitId, 5);
    await assignStorageUnitManual({
      unitId, ownerId, actor: `${prefix}admin`, commandId: 'assign', now: new Date(),
    });
    assert.strictEqual(await createStorageExemptionManual({
      assignmentId: unitId, actor: `${prefix}admin`, commandId: 'exempt', reason: 'Board decision', now: new Date(),
    }), unitId);
    assert.strictEqual((await StorageUnits.findOneAsync(unitId)).exemption.reason, 'Board decision');
    await revokeStorageExemptionManual({ exemptionId: unitId, actor: `${prefix}admin`, commandId: 'revoke' });
    assert.strictEqual((await StorageUnits.findOneAsync(unitId)).exemption, undefined);
  });

  it('writes the current unit into a member move request', async function () {
    const ownerId = `${prefix}request-owner`;
    const unitId = `${prefix}request-unit`;
    const owner = { _id: ownerId, mid: 'five5', name: 'Request Owner', email: 'request@example.com', lab: future() };
    await Members.insertAsync(owner);
    await unit(unitId, 6, 'occupied', ownerId);
    const requestId = await upsertMemberStorageRequest({
      owner, requestType: 'move', preference: { height: 'high' }, actor: ownerId,
      commandId: `${prefix}member-request`, now: new Date(),
    });
    assert.strictEqual((await StorageRequests.findOneAsync(requestId)).source_unit, unitId);
  });
});
