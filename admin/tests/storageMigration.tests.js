import assert from 'assert';
import {
  buildLegacyStorageMigrationManifest,
  buildLegacyStorageMigrationPlan,
  diffLegacyMigrationDocuments,
} from '/imports/storage/legacyMigration';
import {
  applyLegacyStorageMigration,
  finalizeLegacyStorageCutover,
  preflightLegacyStorageMigration,
  STORAGE_MIGRATION_FINALIZED_EVENT_ID,
  STORAGE_MIGRATION_SUMMARY_EVENT_ID,
  validateStorageMigrationState,
} from '/server/storageMigration';
import { requireStorageMigrationOperator } from '/server/methods/storageMigration';
import {
  StorageWalls,
  StorageEvents,
  StorageOffers,
  StorageRequests,
  StorageUnits,
} from '/imports/common/collections/storage';

const d = (value) => new Date(value);
const cutoff = d('2026-09-10T12:00:00.000Z');
const walls = [{ name: 'Wall A', floor: 'floor1', start: 1, end: 4, shelfSize: 2 }];
const membership = (id, mid, start, labend) => ({
  _id: id, mid, type: labend ? 'labandmember' : 'member', start: d(start),
  ...(labend ? { labend: d(labend) } : {}),
});

describe('legacy storage migration', function () {
  const source = () => ({
    walls,
    cutoff,
    members: [
      { _id: 'payer', storage: 1, storagerequest: 'floor2U', lab: d('2027-01-01') },
      { _id: 'dependent', infamily: 'payer' },
      { _id: 'waiting', storagequeue: true, lab: d('2020-01-01') },
      { _id: 'release', storage: 2, storagerequest: 'none', lab: d('2020-01-01') },
    ],
    memberships: [
      membership('payer-new', 'payer', '2025-01-01', '2027-01-01'),
      membership('payer-old', 'payer', '2020-01-01', '2021-01-01'),
      membership('waiting-ms', 'waiting', '2022-02-03'),
      membership('release-ms', 'release', '2021-03-04'),
    ],
    comments: [
      { _id: 'c1', about: '_box_1', text: 'Owner note', created: d('2020-01-01') },
      { _id: 'c3', about: '_box_3', text: 'Blocked', created: d('2020-01-01') },
    ],
  });

  it('maps inventory, canonical ownership, assignments, notes, and requests', function () {
    const plan = buildLegacyStorageMigrationPlan(source());
    assert.strictEqual(plan.report.blocker_count, 0);
    assert.strictEqual(plan.documents.storageWalls.length, 1);
    assert.deepStrictEqual(
      Object.fromEntries(['column_count', 'row_count'].map((key) => [key, plan.documents.storageWalls[0][key]])),
      { column_count: 4, row_count: 1 },
    );
    assert.strictEqual(plan.documents.storageUnits.length, 4);
    const byName = Object.fromEntries(plan.documents.storageUnits.map((unit) => [unit.name, unit]));
    assert.strictEqual(byName['1'].owner, 'payer');
    assert.strictEqual(byName['1'].availability_status, 'occupied');
    assert.strictEqual(byName['1'].note, 'Owner note');
    assert.strictEqual(byName['3'].availability_status, 'unavailable');
    assert.strictEqual(byName['3'].note, 'Blocked');
    assert.strictEqual(byName['4'].availability_status, 'available');
    assert.deepStrictEqual(
      [byName['1'].column, byName['1'].row, byName['2'].column, byName['2'].row],
      [1, 1, 2, 1],
    );
    assert.ok(!('height' in byName['4']));
    const occupied = plan.documents.storageUnits.filter((unit) => unit.availability_status === 'occupied');
    assert.strictEqual(occupied.length, 2);
    assert.ok(occupied.every((unit) => unit.assigned_at.getTime() === cutoff.getTime()));

    const requests = Object.fromEntries(plan.documents.storageRequests.map((request) => [request.owner, request]));
    assert.strictEqual(requests.payer.request_type, 'move');
    assert.deepStrictEqual(requests.payer.preference, { floor: 'floor2', height: 'high' });
    assert.strictEqual(requests.payer.requested_at.toISOString(), '2020-01-01T00:00:00.000Z');
    assert.strictEqual(requests.waiting.request_type, 'allocation');
    assert.strictEqual(requests.waiting.request_status, 'paused_ineligible');
    assert.strictEqual(requests.release.request_type, 'release');
    assert.strictEqual(requests.release.request_status, 'waiting');
    assert.strictEqual(plan.report.counts.unclassified_units, 4);
    assert.deepStrictEqual(plan.report.allocation_blocked_reasons, ['unclassified_units', 'migration_not_applied']);
  });

  it('records that legacy assignment time is unknown and queue time approximate', function () {
    const plan = buildLegacyStorageMigrationPlan(source());
    const assignmentEvent = plan.documents.storageEvents.find((entry) =>
      entry.event_type === 'legacy_occupancy_migrated');
    const requestEvent = plan.documents.storageEvents.find((entry) =>
      entry.event_type === 'legacy_request_migrated');
    assert.strictEqual(assignmentEvent.details.original_assigned_at_known, false);
    assert.strictEqual(assignmentEvent.details.assigned_at_source, 'migration_cutoff');
    assert.strictEqual(requestEvent.details.requested_at_is_approximate, true);
  });

  it('persists a deterministic completeness manifest in the summary commit marker', function () {
    const plan = buildLegacyStorageMigrationPlan(source());
    const summary = plan.documents.storageEvents.find(({ _id }) => _id === STORAGE_MIGRATION_SUMMARY_EVENT_ID);
    const provenance = plan.documents.storageEvents.filter(({ _id }) => _id !== STORAGE_MIGRATION_SUMMARY_EVENT_ID);
    const expected = buildLegacyStorageMigrationManifest({
      ...plan.documents,
      storageEvents: provenance,
    });
    assert.deepStrictEqual(summary.details.manifest, expected);
    assert.ok(!summary.details.manifest.documents.storageEvents.includes(STORAGE_MIGRATION_SUMMARY_EVENT_ID));
  });

  it('treats a request field as queued even when storagequeue is not true', function () {
    const plan = buildLegacyStorageMigrationPlan({
      walls, cutoff,
      members: [{ _id: 'm', storagequeue: false, storagerequest: 'floor1L', lab: d('2027-01-01') }],
      memberships: [membership('ms', 'm', '2020-01-01', '2027-01-01')],
      comments: [],
    });
    assert.strictEqual(plan.documents.storageRequests.length, 1);
    assert.strictEqual(plan.documents.storageRequests[0].request_type, 'allocation');
  });

  it('consolidates duplicate family claims under the payer', function () {
    const plan = buildLegacyStorageMigrationPlan({
      walls, cutoff,
      members: [
        { _id: 'payer', storage: 1, lab: d('2027-01-01') },
        { _id: 'child', infamily: 'payer', storage: 1 },
      ],
      memberships: [membership('ms', 'payer', '2020-01-01', '2027-01-01')],
      comments: [],
    });
    assert.strictEqual(plan.report.blocker_count, 0);
    assert.strictEqual(plan.documents.storageUnits.filter((unit) => unit.owner).length, 1);
    assert.strictEqual(plan.documents.storageUnits.find((unit) => unit.owner).owner, 'payer');
    assert.ok(plan.report.issues.some((issue) => issue.code === 'duplicate_family_claim_collapsed'));
  });

  it('reports blocking legacy anomalies with stable codes', function () {
    const plan = buildLegacyStorageMigrationPlan({
      walls: [
        { name: 'Missing floor', start: 1, end: 2 },
        { name: 'Overlap A', floor: 'floor1', start: 10, end: 11 },
        { name: 'Overlap B', floor: 'floor2', start: 11, end: 12 },
      ],
      cutoff,
      members: [
        { _id: 'out', storage: 99 },
        { _id: 'orphan', infamily: 'missing', storagequeue: true },
        { _id: 'bad-pref', storagerequest: 'basement' },
        { _id: 'release', storagerequest: 'none' },
        { _id: 'assigned', storage: 10, storagequeue: true },
        { _id: 'no-start', storagequeue: true },
      ],
      memberships: [
        membership('bad-pref-ms', 'bad-pref', '2020-01-01'),
        membership('release-ms', 'release', '2020-01-01'),
        membership('assigned-ms', 'assigned', '2020-01-01'),
      ],
      comments: [],
    });
    const codes = new Set(plan.report.issues.filter((issue) => issue.severity === 'blocker').map((issue) => issue.code));
    for (const code of [
      'invalid_wall_definition',
      'overlapping_wall_range',
      'storage_outside_inventory',
      'family_payer_missing',
      'invalid_preference',
      'release_without_assignment',
      'assigned_queue_without_preference',
      'request_owner_missing_membership_start',
    ]) assert.ok(codes.has(code), code);
  });

  it('has a stable order-independent fingerprint that changes with source or cutoff', function () {
    const first = source();
    const reordered = {
      ...first,
      members: [...first.members].reverse(),
      memberships: [...first.memberships].reverse(),
      comments: [...first.comments].reverse(),
    };
    assert.strictEqual(
      buildLegacyStorageMigrationPlan(first).fingerprint,
      buildLegacyStorageMigrationPlan(reordered).fingerprint,
    );
    assert.notStrictEqual(
      buildLegacyStorageMigrationPlan(first).fingerprint,
      buildLegacyStorageMigrationPlan({ ...first, members: [...first.members, { _id: 'new' }] }).fingerprint,
    );
    assert.notStrictEqual(
      buildLegacyStorageMigrationPlan(first).fingerprint,
      buildLegacyStorageMigrationPlan({ ...first, cutoff: d('2026-09-10T12:00:01Z') }).fingerprint,
    );
  });

  it('classifies identical reruns as already present and never overwrites differences', function () {
    const documents = buildLegacyStorageMigrationPlan(source()).documents;
    const empty = diffLegacyMigrationDocuments(documents, {});
    assert.strictEqual(empty.conflicts.length, 0);
    assert.strictEqual(empty.inserts.storageUnits.length, 4);

    const identical = diffLegacyMigrationDocuments(documents, documents);
    assert.strictEqual(identical.conflicts.length, 0);
    assert.ok(Object.values(identical.inserts).every((records) => records.length === 0));

    const changed = {
      ...documents,
      storageUnits: [{ ...documents.storageUnits[0], note: 'Later administrator edit' }],
    };
    const conflict = diffLegacyMigrationDocuments(documents, changed);
    assert.ok(conflict.conflicts.some((entry) =>
      entry.collection === 'storageUnits' && entry.code === 'existing_document_differs'));
  });
});

describe('legacy storage migration database gate', function () {
  const reviewSource = () => ({
    walls: [{ name: 'Migration Review Wall', floor: 'floor1', start: 91001, end: 91002 }],
    cutoff,
    members: [{ _id: 'migration-review-owner', storage: 91001 }],
    memberships: [],
    comments: [],
  });

  const cleanup = async () => {
    await StorageOffers.removeAsync({ _id: { $regex: '^legacy-storage-v1:' } });
    await StorageRequests.removeAsync({ _id: { $regex: '^legacy-storage-v1:' } });
    await StorageUnits.removeAsync({ _id: { $regex: '^legacy-storage-v1:' } });
    await StorageUnits.removeAsync({ _id: { $regex: '^migration-review-' } });
    await StorageWalls.removeAsync({ _id: { $regex: '^legacy-storage-v1:' } });
    await StorageEvents.removeAsync({ _id: { $regex: '^legacy-storage-v1:' } });
  };

  const insertPlan = async (plan, { includeSummary = true } = {}) => {
    for (const wall of plan.documents.storageWalls) await StorageWalls.insertAsync(wall);
    for (const unit of plan.documents.storageUnits) {
      await StorageUnits.insertAsync({ ...unit, height: 'low' });
    }
    for (const request of plan.documents.storageRequests) await StorageRequests.insertAsync(request);
    for (const offer of plan.documents.storageOffers) await StorageOffers.insertAsync(offer);
    for (const migrationEvent of plan.documents.storageEvents) {
      if (includeSummary || migrationEvent._id !== STORAGE_MIGRATION_SUMMARY_EVENT_ID) {
        await StorageEvents.insertAsync(migrationEvent);
      }
    }
  };

  beforeEach(cleanup);
  afterEach(cleanup);

  it('authorizes both admin and board operators but rejects everyone else', async function () {
    const rolesByUser = {
      administrator: ['admin'],
      boardMember: ['board'],
      ordinaryMember: ['member'],
    };
    const roleService = {
      async userIsInRoleAsync(userId, allowed) {
        return (rolesByUser[userId] || []).some((role) => allowed.includes(role));
      },
    };
    await requireStorageMigrationOperator('administrator', roleService);
    await requireStorageMigrationOperator('boardMember', roleService);
    await assert.rejects(
      requireStorageMigrationOperator('ordinaryMember', roleService),
      (error) => error.error === 'not-authorized',
    );
    await assert.rejects(
      requireStorageMigrationOperator(undefined, roleService),
      (error) => error.error === 'not-authorized',
    );
  });

  it('rejects a mismatched fingerprint and a blocker-bearing source before writing', async function () {
    const source = reviewSource();
    await assert.rejects(
      applyLegacyStorageMigration({ fingerprint: 'not-the-preview', cutoff, legacySource: source }),
      (error) => error.code === 'fingerprint_mismatch',
    );
    const blockedSource = {
      walls: [{ name: 'No explicit floor', start: 92001, end: 92001 }],
      cutoff,
      members: [],
      memberships: [],
      comments: [],
    };
    const blockedPlan = buildLegacyStorageMigrationPlan(blockedSource);
    await assert.rejects(
      applyLegacyStorageMigration({
        fingerprint: blockedPlan.fingerprint,
        cutoff,
        legacySource: blockedSource,
      }),
      (error) => error.code === 'migration_blocked',
    );
    assert.strictEqual(await StorageEvents.findOneAsync(STORAGE_MIGRATION_SUMMARY_EVENT_ID), undefined);
  });

  it('previews exact-ID and natural-key target conflicts without writing', async function () {
    const plan = buildLegacyStorageMigrationPlan(reviewSource());
    const clean = await preflightLegacyStorageMigration(plan);
    assert.strictEqual(clean.blocker_count, 0);

    const desired = plan.documents.storageUnits[0];
    await StorageUnits.insertAsync({ ...desired, height: 'low', note: 'later edit' });
    const exact = await preflightLegacyStorageMigration(plan);
    assert.ok(exact.blockers.some(({ code, id }) => code === 'existing_document_differs' && id === desired._id));

    await StorageUnits.removeAsync(desired._id);
    await StorageUnits.insertAsync({
      ...desired,
      _id: 'migration-review-natural-conflict',
      height: 'low',
    });
    const natural = await preflightLegacyStorageMigration(plan);
    assert.ok(natural.blockers.some(({ code }) => code === 'unit_natural_key_conflict'));
  });

  it('never reports an interrupted apply as ready', async function () {
    const source = reviewSource();
    const plan = buildLegacyStorageMigrationPlan(source);
    await insertPlan(plan, { includeSummary: false });
    const state = await validateStorageMigrationState({ legacySource: source });
    assert.strictEqual(state.migration_applied, false);
    assert.strictEqual(state.allocation_ready, false);
    assert.ok(state.allocation_blocked_reasons.includes('migration_not_applied'));
  });

  it('resumes a partial apply and makes a completed rerun idempotent', async function () {
    const source = reviewSource();
    const plan = buildLegacyStorageMigrationPlan(source);
    await StorageUnits.insertAsync(plan.documents.storageUnits[0]);
    const resumed = await applyLegacyStorageMigration({
      fingerprint: plan.fingerprint,
      cutoff,
      legacySource: source,
    });
    assert.strictEqual(resumed.inserted.storageUnits, 1);
    assert.strictEqual(resumed.validation.migration_manifest.complete, true);
    assert.ok(resumed.preview_report);
    assert.strictEqual('report' in resumed, false);

    const repeated = await applyLegacyStorageMigration({
      fingerprint: plan.fingerprint,
      cutoff,
      legacySource: source,
    });
    assert.ok(Object.values(repeated.inserted).every((count) => count === 0));
    assert.strictEqual(repeated.validation.migration_manifest.complete, true);
  });

  it('requires every manifest target, permits extra v2 documents, and reports deletions', async function () {
    const source = reviewSource();
    const plan = buildLegacyStorageMigrationPlan(source);
    await insertPlan(plan);
    await StorageUnits.insertAsync({
      _id: 'migration-review-later-v2-unit',
      name: 'Later v2 unit',
      floor: 'floor1',
      height: 'high',
      wall_id: plan.documents.storageWalls[0]._id,
      column: 1,
      row: 3,
      availability_status: 'available',
      createdAt: cutoff,
      updatedAt: cutoff,
    });
    const complete = await validateStorageMigrationState({ legacySource: source });
    assert.strictEqual(complete.migration_manifest.complete, true);
    assert.strictEqual(complete.allocation_ready, true);

    const provenance = plan.documents.storageEvents.find(({ _id }) => _id !== STORAGE_MIGRATION_SUMMARY_EVENT_ID);
    await StorageEvents.removeAsync(provenance._id);
    const deleted = await validateStorageMigrationState({ legacySource: source });
    assert.strictEqual(deleted.migration_manifest.complete, false);
    assert.deepStrictEqual(deleted.migration_manifest.missing.storageEvents, [provenance._id]);
    assert.ok(deleted.allocation_blocked_reasons.includes('migration_manifest_incomplete'));
  });

  it('gates source drift until an audited finalization event retires the legacy source', async function () {
    const source = reviewSource();
    const plan = buildLegacyStorageMigrationPlan(source);
    await insertPlan(plan);
    const changedSource = {
      ...source,
      members: [{ _id: 'migration-review-owner', storage: 91002 }],
    };
    const drifted = await validateStorageMigrationState({ legacySource: changedSource });
    assert.strictEqual(drifted.legacy_source_changed, true);
    assert.ok(drifted.allocation_blocked_reasons.includes('legacy_source_changed_after_migration'));

    const finalize = () => finalizeLegacyStorageCutover({
      fingerprint: plan.fingerprint,
      actor: 'migration-review-admin',
      reason: 'Legacy fields approved for retirement',
      now: new Date(cutoff.getTime() + 1000),
      legacySource: source,
    });
    const finalizations = await Promise.all([finalize(), finalize()]);
    assert.deepStrictEqual(
      finalizations.map(({ already_finalized }) => already_finalized).sort(),
      [false, true],
    );
    const auditEvent = await StorageEvents.findOneAsync(STORAGE_MIGRATION_FINALIZED_EVENT_ID);
    assert.strictEqual(auditEvent.actor, 'migration-review-admin');
    assert.strictEqual(auditEvent.reason, 'Legacy fields approved for retirement');
    const finalized = await validateStorageMigrationState({ legacySource: changedSource });
    assert.strictEqual(finalized.cutover_finalized, true);
    assert.strictEqual(finalized.legacy_source_check_skipped, true);
    assert.strictEqual(finalized.legacy_source_changed, false);
    assert.strictEqual(finalized.allocation_ready, true);
  });

  it('rejects a cutover finalization event with the wrong event type', async function () {
    const source = reviewSource();
    const plan = buildLegacyStorageMigrationPlan(source);
    await insertPlan(plan);
    const summary = plan.documents.storageEvents.find(
      ({ _id }) => _id === STORAGE_MIGRATION_SUMMARY_EVENT_ID,
    );
    await StorageEvents.insertAsync({
      _id: STORAGE_MIGRATION_FINALIZED_EVENT_ID,
      entity_type: 'storageMigration',
      entity_id: plan.version,
      event_type: 'legacy_storage_cutover_typo',
      actor_type: 'administrator',
      actor: 'migration-review-admin',
      occurred_at: new Date(cutoff.getTime() + 1000),
      reason: 'Malformed event regression fixture',
      details: {
        fingerprint: plan.fingerprint,
        summary_event_id: STORAGE_MIGRATION_SUMMARY_EVENT_ID,
        manifest_digest: summary.details.manifest.digest,
      },
    });
    const state = await validateStorageMigrationState({ legacySource: source });
    assert.strictEqual(state.cutover_finalized, false);
    assert.strictEqual(state.allocation_ready, false);
    assert.ok(state.allocation_blocked_reasons.includes('cutover_finalization_invalid'));
  });
});
