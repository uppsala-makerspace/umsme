import assert from 'assert';
import { Members } from '/imports/common/collections/members';
import {
  StorageUnits,
  StorageRequests,
  StorageAssignments,
  StorageWarnings,
  StorageExemptions,
  StorageMoves,
  StorageNotificationDeliveries,
  StorageEvents,
  StorageActionExecutions,
} from '/imports/common/collections/storage';
import { previewStorageSuggestions } from '/imports/common/server/storage/suggestions';
import { confirmStorageSuggestions } from '/imports/common/server/storage/commands';
import { reconcileStorageState } from '/imports/common/server/storage/reconciliation';
import {
  assignStorageUnitManual,
  createStorageUnitManual,
  upsertStorageRequestManual,
} from '/imports/common/server/storage/manual';
import { upsertMemberStorageRequest } from '/imports/common/server/storage/memberCommands';
import { storageMigrationFingerprint } from '/imports/common/lib/legacyStorageMigrationFingerprint';
import {
  STORAGE_CUTOVER_FINALIZED_ID,
  STORAGE_MIGRATION_SUMMARY_ID,
} from '/imports/common/server/storage/readiness';
import { setStorageJournalFailureInjectorForTests } from '/imports/common/server/storage/journal';

const prefix = 'storage-service-test:';
const now = () => new Date();
const future = () => new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

const collections = [
  StorageUnits, StorageRequests, StorageAssignments, StorageWarnings,
  StorageExemptions, StorageMoves, StorageNotificationDeliveries,
  StorageEvents, StorageActionExecutions,
];

const cleanup = async () => {
  // The service deliberately creates opaque/random identifiers, so filtering
  // cleanup by the fixture prefix would leak assignments, receipts and events
  // into the next integration test.
  for (const collection of collections) await collection.removeAsync({});
  await Members.removeAsync({ _id: { $regex: `^${prefix}` } });
};

const installReadyMigration = async (created, documents = {
  storageUnits: [], storageAssignments: [], storageRequests: [], storageEvents: [],
}) => {
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
    details: {
      fingerprint, summary_event_id: STORAGE_MIGRATION_SUMMARY_ID, manifest_digest: manifest.digest,
    },
  });
};

describe('storage server database workflow', function () {
  beforeEach(cleanup);
  afterEach(async () => {
    setStorageJournalFailureInjectorForTests(undefined);
    await cleanup();
  });

  it('commits an assignment, receipt, event, and outbox row exactly once', async function () {
    const created = now();
    const ownerId = `${prefix}owner`;
    const unitId = `${prefix}unit`;
    const requestId = `${prefix}request`;
    await Members.insertAsync({ _id: ownerId, mid: 'sst1', name: 'Storage Test', email: 'storage@example.com', lab: future() });
    await StorageUnits.insertAsync({
      _id: unitId, name: `${prefix}1`, floor: 'floor1', height: 'low', wall: `${prefix}wall`,
      position: 1, availability_status: 'available', createdAt: created, updatedAt: created,
    });
    await StorageRequests.insertAsync({
      _id: requestId, owner: ownerId, request_type: 'allocation', requested_at: created,
      request_status: 'waiting', createdAt: created, updatedAt: created,
    });
    await installReadyMigration(created);

    const preview = await previewStorageSuggestions('allocate');
    assert.strictEqual(preview.rows.length, 1);
    const command = {
      action: 'allocate', commandId: `${prefix}command`, actor: `${prefix}admin`,
      selections: [{ suggestion_id: preview.rows[0].suggestion_id }],
    };
    const first = await confirmStorageSuggestions(command);
    const second = await confirmStorageSuggestions(command);
    assert.strictEqual(first.results[0].status, 'applied');
    assert.strictEqual(second.results[0].status, 'already_applied');
    assert.strictEqual(await StorageAssignments.find({ owner: ownerId, ended_at: { $exists: false } }).countAsync(), 1);
    assert.strictEqual(await StorageNotificationDeliveries.find({ owner: ownerId, decision_type: 'assignment' }).countAsync(), 1);
    assert.strictEqual(await StorageActionExecutions.find({ command_id: `${prefix}command` }).countAsync(), 2);
    const unit = await StorageUnits.findOneAsync(unitId);
    assert.strictEqual(unit.availability_status, 'occupied');
    assert.strictEqual(unit.owner, ownerId);
  });

  it('resumes a standalone assignment after every effect boundary', async function () {
    for (const [index, failedStep] of [
      'unit_occupied', 'request_fulfilled', 'assignment_inserted', 'event_inserted', 'outbox_inserted',
    ].entries()) {
      await cleanup();
      const created = new Date(Date.now() + index * 1000);
      const ownerId = `${prefix}journal-owner-${index}`;
      const unitId = `${prefix}journal-unit-${index}`;
      await Members.insertAsync({ _id: ownerId, mid: `ssj${index}`, name: 'Journal Test', email: 'storage@example.com', lab: future() });
      await StorageUnits.insertAsync({
        _id: unitId, name: unitId, floor: 'floor1', height: 'low', wall: `${prefix}journal-wall`,
        position: index + 1, availability_status: 'available', createdAt: created, updatedAt: created,
      });
      await StorageRequests.insertAsync({
        _id: `${prefix}journal-request-${index}`, owner: ownerId, request_type: 'allocation',
        requested_at: created, request_status: 'waiting', createdAt: created, updatedAt: created,
      });
      await installReadyMigration(created);
      const preview = await previewStorageSuggestions('allocate');
      const command = {
        action: 'allocate', commandId: `${prefix}journal-command-${index}`, actor: `${prefix}admin`,
        selections: [{ suggestion_id: preview.rows[0].suggestion_id }],
      };
      let injected = false;
      setStorageJournalFailureInjectorForTests(({ step, point }) => {
        if (!injected && step === failedStep && point === 'after_effect') {
          injected = true;
          throw new Error(`injected after ${step}`);
        }
      });
      const failed = await confirmStorageSuggestions(command);
      assert.strictEqual(failed.results[0].status, 'failed');
      setStorageJournalFailureInjectorForTests(undefined);
      const resumed = await confirmStorageSuggestions(command);
      assert.strictEqual(resumed.results[0].status, 'applied');
      assert.strictEqual(await StorageAssignments.find({ owner: ownerId }).countAsync(), 1);
      assert.strictEqual(await StorageEvents.find({ event_type: 'assignment_created' }).countAsync(), 1);
      assert.strictEqual(await StorageNotificationDeliveries.find({ owner: ownerId }).countAsync(), 1);
    }
  });

  it('resumes warning audit and outbox work after the warning document was committed', async function () {
    const created = new Date(Date.now() - 40 * 86400000);
    const ownerId = `${prefix}warning-owner`;
    const unitId = `${prefix}warning-unit`;
    const assignmentId = `${prefix}warning-assignment`;
    await Members.insertAsync({ _id: ownerId, mid: 'ssjw', name: 'Warning Journal', email: 'warn@example.com', lab: created });
    await StorageUnits.insertAsync({
      _id: unitId, name: unitId, floor: 'floor1', height: 'low', wall: `${prefix}wall`, position: 91,
      availability_status: 'occupied', owner: ownerId, createdAt: created, updatedAt: created,
    });
    await StorageAssignments.insertAsync({
      _id: assignmentId, unit: unitId, owner: ownerId, assigned_at: created,
      assigned_by: `${prefix}admin`, createdAt: created, updatedAt: created,
    });
    const preview = await previewStorageSuggestions('warn');
    const command = {
      action: 'warn', commandId: `${prefix}warning-command`, actor: `${prefix}admin`,
      selections: [{ suggestion_id: preview.rows[0].suggestion_id }],
    };
    setStorageJournalFailureInjectorForTests(({ step, point }) => {
      if (step === 'warning_inserted' && point === 'after_effect') throw new Error('injected warning gap');
    });
    assert.strictEqual((await confirmStorageSuggestions(command)).results[0].status, 'failed');
    setStorageJournalFailureInjectorForTests(undefined);
    assert.strictEqual((await confirmStorageSuggestions(command)).results[0].status, 'applied');
    assert.strictEqual(await StorageWarnings.find({ assignment: assignmentId }).countAsync(), 1);
    assert.strictEqual(await StorageEvents.find({ event_type: 'warning_created' }).countAsync(), 1);
    assert.strictEqual(await StorageNotificationDeliveries.find({ decision_type: 'warning' }).countAsync(), 1);
  });

  it('resumes member and manual audit writes without duplicating domain records', async function () {
    const created = now();
    const owner = { _id: `${prefix}member-journal`, mid: 'ssjm', name: 'Member Journal', lab: future() };
    await Members.insertAsync(owner);
    let failures = 0;
    setStorageJournalFailureInjectorForTests(({ step, point }) => {
      if (((step === 'request_written' && point === 'after_checkpoint') ||
          (step === 'unit_inserted' && point === 'after_effect'))) {
        failures += 1;
        throw new Error('injected domain/audit gap');
      }
    });
    const requestArgs = {
      owner, requestType: 'allocation', actor: owner._id,
      commandId: `${prefix}member-request-command`, now: created,
    };
    await assert.rejects(upsertMemberStorageRequest(requestArgs), /injected domain\/audit gap/);
    setStorageJournalFailureInjectorForTests(undefined);
    const requestId = await upsertMemberStorageRequest(requestArgs);
    assert.strictEqual(await StorageRequests.find({ _id: requestId }).countAsync(), 1);
    assert.strictEqual(await StorageEvents.find({ entity_id: requestId }).countAsync(), 1);

    setStorageJournalFailureInjectorForTests(({ step, point }) => {
      if (step === 'unit_inserted' && point === 'after_effect') throw new Error('injected unit/audit gap');
    });
    const unitArgs = {
      fields: { name: `${prefix}manual-unit`, floor: 'floor1', height: 'high', wall: `${prefix}wall`, position: 92 },
      actor: `${prefix}admin`, commandId: `${prefix}unit-command`, now: created,
    };
    await assert.rejects(createStorageUnitManual(unitArgs), /injected unit\/audit gap/);
    setStorageJournalFailureInjectorForTests(undefined);
    await StorageActionExecutions.updateAsync(
      { command_id: unitArgs.commandId, operation_kind: 'manual.unit.create' },
      { $set: { execution_status: 'processing', lease_expires_at: new Date(Date.now() - 1000) } },
    );
    const unitId = await createStorageUnitManual(unitArgs);
    assert.strictEqual(await StorageUnits.find({ _id: unitId }).countAsync(), 1);
    assert.strictEqual(await StorageEvents.find({ entity_id: unitId }).countAsync(), 1);
    assert.strictEqual(failures, 1);
  });

  it('scopes member command keys and rejects changed manual intent', async function () {
    const created = now();
    const firstOwner = { _id: `${prefix}intent-owner-1`, mid: 'ssi1', name: 'Intent One', lab: future() };
    const secondOwner = { _id: `${prefix}intent-owner-2`, mid: 'ssi2', name: 'Intent Two', lab: future() };
    await Members.insertAsync(firstOwner);
    await Members.insertAsync(secondOwner);
    const commandId = `${prefix}shared-member-command`;
    const firstRequest = await upsertMemberStorageRequest({
      owner: firstOwner, requestType: 'allocation', preference: { floor: 'floor1' },
      actor: firstOwner._id, commandId, now: created,
    });
    const secondRequest = await upsertMemberStorageRequest({
      owner: secondOwner, requestType: 'allocation', preference: { floor: 'floor2' },
      actor: secondOwner._id, commandId, now: created,
    });
    assert.notStrictEqual(firstRequest, secondRequest);
    assert.strictEqual((await StorageRequests.findOneAsync(firstRequest)).owner, firstOwner._id);
    assert.strictEqual((await StorageRequests.findOneAsync(secondRequest)).owner, secondOwner._id);
    await assert.rejects(
      upsertMemberStorageRequest({
        owner: firstOwner, requestType: 'allocation', preference: { floor: 'floor2' },
        actor: firstOwner._id, commandId, now: created,
      }),
      /different storage operation/,
    );

    const unitCommand = `${prefix}intent-unit-command`;
    const common = { actor: `${prefix}admin`, commandId: unitCommand, now: created };
    const unitMetadata = { floor: 'floor1', wall: `${prefix}wall`, position: 120 };
    await createStorageUnitManual({
      ...common, fields: { ...unitMetadata, name: `${prefix}intent-unit`, availability_status: 'available' },
    });
    await assert.rejects(
      createStorageUnitManual({
        ...common, fields: { ...unitMetadata, name: `${prefix}changed-unit`, availability_status: 'unavailable' },
      }),
      /different storage operation/,
    );
  });

  it('locks the complete suggested batch intent for a command id', async function () {
    const base = { action: 'warn', commandId: `${prefix}batch-command`, actor: `${prefix}admin` };
    const selections = [{ suggestion_id: 'first' }, { suggestion_id: 'second' }];
    await confirmStorageSuggestions({ ...base, selections });
    await assert.rejects(
      confirmStorageSuggestions({ ...base, selections: selections.slice(0, 1) }),
      /different storage operation/,
    );
    await assert.rejects(
      confirmStorageSuggestions({ ...base, selections: [...selections, { suggestion_id: 'invented' }] }),
      /different storage operation/,
    );
  });

  it('blocks allocation when a manifest record is missing', async function () {
    const created = now();
    await installReadyMigration(created, {
      storageUnits: [`${prefix}missing-unit`],
      storageAssignments: [], storageRequests: [], storageEvents: [],
    });
    const preview = await previewStorageSuggestions('allocate');
    assert.strictEqual(preview.blocked, true);
    assert(preview.readiness.allocation_blocked_reasons.includes('migration_manifest_incomplete'));
    assert.deepStrictEqual(preview.readiness.missing_migrated_documents.storageUnits, [`${prefix}missing-unit`]);
  });

  it('rechecks migration readiness between preview and confirmation', async function () {
    const created = now();
    const ownerId = `${prefix}owner`;
    const unitId = `${prefix}unit`;
    await Members.insertAsync({ _id: ownerId, mid: 'sst3', name: 'Storage Test', lab: future() });
    await StorageUnits.insertAsync({
      _id: unitId, name: `${prefix}2`, floor: 'floor1', height: 'low', wall: `${prefix}wall`,
      position: 2, availability_status: 'available', createdAt: created, updatedAt: created,
    });
    await StorageRequests.insertAsync({
      _id: `${prefix}request`, owner: ownerId, request_type: 'allocation', requested_at: created,
      request_status: 'waiting', createdAt: created, updatedAt: created,
    });
    await installReadyMigration(created);
    const preview = await previewStorageSuggestions('allocate');
    assert.strictEqual(preview.rows.length, 1);
    await StorageEvents.updateAsync(STORAGE_MIGRATION_SUMMARY_ID, {
      $set: { 'details.manifest.digest': `${prefix}tampered` },
    });
    const result = await confirmStorageSuggestions({
      action: 'allocate', commandId: `${prefix}stale-command`, actor: `${prefix}admin`,
      selections: [{ suggestion_id: preview.rows[0].suggestion_id }],
    });
    assert.strictEqual(result.results[0].status, 'stale');
    assert.strictEqual(await StorageAssignments.find({ owner: ownerId }).countAsync(), 0);
  });

  it('manual assignment requires a queue override and otherwise consumes the request without notifying', async function () {
    const created = now();
    const ownerId = `${prefix}owner`;
    const unitId = `${prefix}unit`;
    await Members.insertAsync({ _id: ownerId, mid: 'sst4', name: 'Storage Test', lab: future() });
    await StorageUnits.insertAsync({
      _id: unitId, name: `${prefix}3`, floor: 'floor1', height: 'low', wall: `${prefix}wall`,
      position: 3, availability_status: 'available', createdAt: created, updatedAt: created,
    });
    await assert.rejects(
      assignStorageUnitManual({ unitId, ownerId, actor: `${prefix}admin`, now: created }),
      (error) => error.error === 'override-required',
    );
    const requestId = `${prefix}request`;
    await StorageRequests.insertAsync({
      _id: requestId, owner: ownerId, request_type: 'allocation', requested_at: created,
      request_status: 'waiting', createdAt: created, updatedAt: created,
    });
    const assignmentId = await assignStorageUnitManual({
      unitId, ownerId, actor: `${prefix}admin`, now: new Date(created.getTime() + 1000),
    });
    const [assignment, request] = await Promise.all([
      StorageAssignments.findOneAsync(assignmentId), StorageRequests.findOneAsync(requestId),
    ]);
    assert.strictEqual(assignment.request, requestId);
    assert.strictEqual(request.request_status, 'fulfilled');
    assert.strictEqual(await StorageNotificationDeliveries.find({ owner: ownerId }).countAsync(), 0);
  });

  it('finds an active request by owner and keeps its queue date when preferences change', async function () {
    const created = now();
    const ownerId = `${prefix}request-owner`;
    const requestId = `${prefix}editable-request`;
    await Members.insertAsync({ _id: ownerId, mid: 'sstrq', name: 'Queue Test', lab: future() });
    await StorageRequests.insertAsync({
      _id: requestId, owner: ownerId, request_type: 'allocation', requested_at: created,
      preference: { floor: 'floor1' }, request_status: 'waiting', createdAt: created, updatedAt: created,
    });

    const returnedId = await upsertStorageRequestManual({
      ownerId, requestType: 'allocation', preference: { floor: 'floor2', height: 'high' },
      actor: `${prefix}admin`, commandId: `${prefix}preference-command`,
      now: new Date(created.getTime() + 1000),
    });
    const request = await StorageRequests.findOneAsync(requestId);
    assert.strictEqual(returnedId, requestId);
    assert.strictEqual(await StorageRequests.find({ owner: ownerId }).countAsync(), 1);
    assert.strictEqual(request.requested_at.getTime(), created.getTime());
    assert.deepStrictEqual(request.preference, { floor: 'floor2', height: 'high' });

    await assert.rejects(
      upsertStorageRequestManual({
        ownerId, requestType: 'allocation', preference: request.preference,
        requestedAt: new Date(created.getTime() - 86400000), actor: `${prefix}admin`,
        commandId: `${prefix}date-command`, now: new Date(created.getTime() + 2000),
      }),
      (error) => error.error === 'missing-reason',
    );
  });

  it('persists an administrator inspection decision on a suggested move', async function () {
    const created = now();
    const ownerId = `${prefix}owner`;
    const sourceId = `${prefix}source`;
    const destinationId = `${prefix}destination`;
    const assignmentId = `${prefix}assignment`;
    const requestId = `${prefix}request`;
    await Members.insertAsync({ _id: ownerId, mid: 'sst5', name: 'Storage Test', lab: future() });
    await StorageUnits.insertAsync({
      _id: sourceId, name: `${prefix}source`, floor: 'floor1', height: 'high', wall: `${prefix}wall`,
      position: 4, availability_status: 'occupied', owner: ownerId, createdAt: created, updatedAt: created,
    });
    await StorageUnits.insertAsync({
      _id: destinationId, name: `${prefix}destination`, floor: 'floor1', height: 'low', wall: `${prefix}wall`,
      position: 5, availability_status: 'available', createdAt: created, updatedAt: created,
    });
    await StorageAssignments.insertAsync({
      _id: assignmentId, unit: sourceId, owner: ownerId, assigned_at: created,
      assigned_by: `${prefix}admin`, createdAt: created, updatedAt: created,
    });
    await StorageRequests.insertAsync({
      _id: requestId, owner: ownerId, request_type: 'move', preference: { height: 'low' },
      source_assignment: assignmentId, requested_at: created, request_status: 'waiting',
      createdAt: created, updatedAt: created,
    });
    await installReadyMigration(created);
    const preview = await previewStorageSuggestions('allocate');
    assert.strictEqual(preview.rows[0].decision_type, 'move');
    const result = await confirmStorageSuggestions({
      action: 'allocate', commandId: `${prefix}move-command`, actor: `${prefix}admin`,
      selections: [{ suggestion_id: preview.rows[0].suggestion_id, requires_inspection: true }],
    });
    assert.strictEqual(result.results[0].status, 'applied');
    const move = await StorageMoves.findOneAsync(result.results[0].decision_id);
    assert.strictEqual(move.requires_inspection, true);
  });

  it('pauses and resumes without changing queue age and resolves renewal warnings', async function () {
    const created = now();
    const ownerId = `${prefix}owner`;
    await Members.insertAsync({ _id: ownerId, mid: 'sst2', name: 'Storage Test', lab: new Date(created.getTime() - 1000) });
    await StorageRequests.insertAsync({
      _id: `${prefix}request`, owner: ownerId, request_type: 'allocation', requested_at: created,
      request_status: 'waiting', createdAt: created, updatedAt: created,
    });
    await StorageWarnings.insertAsync({
      _id: `${prefix}warning`, assignment: `${prefix}assignment`, owner: ownerId,
      warned_at: created, warned_by: `${prefix}admin`, deadline_at: new Date(created.getTime() + 28 * 86400000),
      warning_status: 'open', createdAt: created, updatedAt: created,
    });
    setStorageJournalFailureInjectorForTests(({ step, point, operation }) => {
      if (operation.action_type === 'reconciliation' && step === 'domain_updated' && point === 'after_effect') {
        throw new Error('injected reconciliation audit gap');
      }
    });
    await assert.rejects(
      reconcileStorageState({ ownerIds: [ownerId] }),
      /injected reconciliation audit gap/,
    );
    setStorageJournalFailureInjectorForTests(undefined);
    await reconcileStorageState({ ownerIds: [ownerId] });
    const paused = await StorageRequests.findOneAsync(`${prefix}request`);
    assert.strictEqual(paused.request_status, 'paused_ineligible');
    assert.strictEqual(paused.requested_at.getTime(), created.getTime());

    await Members.updateAsync(ownerId, { $set: { lab: future() } });
    await reconcileStorageState({ ownerIds: [ownerId] });
    const resumed = await StorageRequests.findOneAsync(`${prefix}request`);
    const warning = await StorageWarnings.findOneAsync(`${prefix}warning`);
    assert.strictEqual(resumed.request_status, 'waiting');
    assert.strictEqual(resumed.requested_at.getTime(), created.getTime());
    assert.strictEqual(warning.warning_status, 'resolved_renewal');
  });
});
