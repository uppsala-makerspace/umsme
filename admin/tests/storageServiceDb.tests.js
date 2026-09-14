import assert from 'assert';
import { Members } from '/imports/common/collections/members';
import { Messages } from '/imports/common/collections/messages';
import {
  StorageWalls, StorageUnits, StorageRequests, StorageOffers, StorageEvents,
} from '/imports/common/collections/storage';
import { previewStorageSuggestions } from '/imports/common/server/storage/suggestions';
import { confirmStorageSuggestions, completeStorageOffer } from '/imports/common/server/storage/commands';
import { reconcileStorageState } from '/imports/common/server/storage/reconciliation';
import {
  assignStorageUnitManual, createStorageExemptionManual, createStorageUnitManual,
  revokeStorageExemptionManual, updateStorageUnitManual, updateStorageWallManual,
} from '/imports/common/server/storage/manual';
import { confirmMemberStorageOffer, upsertMemberStorageRequest } from '/imports/common/server/storage/memberCommands';
import { ensureStorageIndexes } from '/imports/common/server/storageIndexes';
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

const unit = (id, column, status = 'available', owner, row = 2) => {
  const created = new Date();
  return StorageUnits.insertAsync({
    _id: id, name: id, floor: 'floor1', height: row === 1 ? 'high' : 'low',
    wall_id: `${prefix}wall`, column, row,
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
  before(async function () {
    await ensureStorageIndexes();
  });

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
    assert.strictEqual(stored.source_request, requestId);
    assert(stored.assigned_at instanceof Date);
    assert.strictEqual(await Messages.find({ member: ownerId, type: 'storage' }).countAsync(), 1);
  });

  it('derives height when units and wall layouts change', async function () {
    const wallId = `${prefix}wall`;
    const actor = `${prefix}admin`;
    await updateStorageWallManual({
      wallId, fields: { row_count: 4 }, actor, commandId: 'wall-four-rows',
    });
    const unitId = await createStorageUnitManual({
      fields: {
        name: `${prefix}derived-unit`, wall_id: wallId, column: 1, row: 2,
        availability_status: 'available',
      },
      actor,
      commandId: 'create-derived-unit',
    });
    assert.strictEqual((await StorageUnits.findOneAsync(unitId)).height, 'high');

    await updateStorageWallManual({
      wallId, fields: { row_count: 3 }, actor, commandId: 'wall-three-rows',
    });
    assert.strictEqual((await StorageUnits.findOneAsync(unitId)).height, 'low');

    await updateStorageUnitManual({
      unitId, fields: { row: 1 }, actor, commandId: 'move-to-top-row',
    });
    assert.strictEqual((await StorageUnits.findOneAsync(unitId)).height, 'high');
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
    await unit(sourceId, 3, 'occupied', ownerId, 1);
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
    await completeStorageOffer({ offerId, actor: ownerId, actorType: 'member' });
    assert.strictEqual(await StorageOffers.findOneAsync(offerId), undefined);
    assert.strictEqual((await StorageUnits.findOneAsync(destinationId)).availability_status, 'occupied');
    assert.strictEqual((await StorageUnits.findOneAsync(sourceId)).availability_status, 'available');
    assert(await StorageEvents.findOneAsync({ entity_id: offerId, event_type: 'offer_completed' }));
  });

  it('rejects member completion after eligibility or the offer deadline has ended', async function () {
    const now = new Date();
    const insertOffer = (id, owner, deadline) => StorageOffers.insertAsync({
      _id: id, owner: owner._id, request: `${id}:request`, from_unit: `${id}:from`, to_unit: `${id}:to`,
      offered_at: new Date(now.getTime() - 86400000), offered_by: `${prefix}admin`,
      deadline_at: deadline, requires_inspection: false, createdAt: now, updatedAt: now,
    });
    const expiredOwner = { _id: `${prefix}expired`, lab: future() };
    const expiredOfferId = `${prefix}expired-offer`;
    await insertOffer(expiredOfferId, expiredOwner, new Date(now.getTime() - 1));
    await assert.rejects(
      confirmMemberStorageOffer({ owner: expiredOwner, offerId: expiredOfferId, actor: expiredOwner._id, now }),
      (error) => error.error === 'offer-expired',
    );

    const ineligibleOwner = { _id: `${prefix}ineligible`, lab: past() };
    const ineligibleOfferId = `${prefix}ineligible-offer`;
    await insertOffer(ineligibleOfferId, ineligibleOwner, new Date(now.getTime() + 86400000));
    await assert.rejects(
      confirmMemberStorageOffer({ owner: ineligibleOwner, offerId: ineligibleOfferId, actor: ineligibleOwner._id, now }),
      (error) => error.error === 'not-eligible',
    );
  });

  it('preserves an overdue warning when an administrator completes the offer', async function () {
    const now = new Date();
    const ownerId = `${prefix}overdue`;
    const sourceId = `${prefix}old`;
    const destinationId = `${prefix}new`;
    const requestId = `${prefix}request`;
    const offerId = `${prefix}offer`;
    const warning = {
      id: `${prefix}warning`, warned_at: new Date(now.getTime() - 29 * 86400000),
      warned_by: `${prefix}admin`, deadline_at: new Date(now.getTime() - 86400000),
    };
    await Members.insertAsync({ _id: ownerId, mid: 'five6', name: 'Overdue Owner', lab: past() });
    await unit(sourceId, 7, 'occupied', ownerId);
    await StorageUnits.updateAsync(sourceId, { $set: { warning } });
    await unit(destinationId, 8, 'reserved', ownerId);
    await StorageRequests.insertAsync({
      _id: requestId, owner: ownerId, request_type: 'move', source_unit: sourceId,
      preference: { height: 'low' }, requested_at: now, request_status: 'in_progress',
      createdAt: now, updatedAt: now,
    });
    await StorageOffers.insertAsync({
      _id: offerId, owner: ownerId, request: requestId, from_unit: sourceId, to_unit: destinationId,
      offered_at: new Date(now.getTime() - 15 * 86400000), offered_by: `${prefix}admin`,
      deadline_at: new Date(now.getTime() - 86400000), requires_inspection: false,
      createdAt: now, updatedAt: now,
    });

    await completeStorageOffer({ offerId, actor: `${prefix}admin`, actorType: 'administrator' });

    assert.deepStrictEqual((await StorageUnits.findOneAsync(destinationId)).warning, warning);
    assert.strictEqual((await StorageUnits.findOneAsync(sourceId)).availability_status, 'available');
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
      unitId, actor: `${prefix}admin`, commandId: 'exempt', reason: 'Board decision', now: new Date(),
    }), unitId);
    assert.strictEqual((await StorageUnits.findOneAsync(unitId)).exemption.reason, 'Board decision');
    await revokeStorageExemptionManual({ unitId, actor: `${prefix}admin`, commandId: 'revoke' });
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
