import assert from 'assert';
import {
  bulkHeightImpact,
  filterStorageQueue,
  filterStorageUnits,
  groupStorageWalls,
  joinBulkHeightResults,
  joinStorageResults,
  sameSuggestionSet,
  storageActionReasonLabel,
  storageMemberLabel,
  storagePreferenceLabel,
  storageQueueRows,
  storageReadinessPresentation,
  storageResultSummary,
} from '/imports/storage/presentation';
import { storageEventEntityIds, storageEventRows } from '/imports/storage/eventLog';

describe('storage admin presentation', function () {
  const units = [
    { _id: 'b', name: '2', wall_id: 'B', wall_name: 'Wall B', column: 2, row: 1, floor: 'floor2', availability_status: 'occupied', owner: 'm' },
    { _id: 'a', name: '1', wall_id: 'A', wall_name: 'Wall A', column: 1, row: 1, floor: 'floor1', availability_status: 'available' },
    { _id: 'c', name: '3', wall_id: 'B', wall_name: 'Wall B', column: 1, row: 1, floor: 'floor2', height: 'high', availability_status: 'available', note: 'repair' },
  ];

  it('filters inventory without changing source order', function () {
    assert.deepStrictEqual(filterStorageUnits(units, { height: 'unclassified' }).map((x) => x._id), ['b', 'a']);
    assert.deepStrictEqual(filterStorageUnits(units, { query: 'repair' }).map((x) => x._id), ['c']);
    assert.strictEqual(units[0]._id, 'b');
  });

  it('renders each wall as its configured uniform grid', function () {
    const walls = groupStorageWalls(units, [
      { _id: 'B', name: 'Wall B', display_order: 2, column_count: 2, row_count: 2 },
      { _id: 'A', name: 'Wall A', display_order: 1, column_count: 1, row_count: 1 },
    ]);
    assert.deepStrictEqual(walls.map((wall) => wall.name), ['Wall A', 'Wall B']);
    assert.deepStrictEqual(walls[1].units.map((unit) => unit._id), ['c', 'b']);
    assert.deepStrictEqual(walls[1].columns.map((column) =>
      column.units.map((unit) => unit._id || null)), [['c', null], ['b', null]]);
    assert.strictEqual(walls[1].columns[0].units[1].empty, true);
  });

  it('labels searchable member choices without exposing only an internal id', function () {
    assert.strictEqual(storageMemberLabel({ name: 'Ada Lovelace', mid: 'M42', email: 'ada@example.com' }),
      'Ada Lovelace (M42) — ada@example.com');
  });

  it('builds the visible queue in waiting order with assignment and eligibility context', function () {
    const now = new Date('2026-09-11T12:00:00Z');
    const rows = storageQueueRows({
      now,
      requests: [
        { _id: 'later', owner: 'active', request_type: 'move', request_status: 'waiting', requested_at: new Date('2026-02-01'), preference: { floor: 'floor2', height: 'high' } },
        { _id: 'release', owner: 'active', request_type: 'release', request_status: 'waiting', requested_at: new Date('2025-01-01') },
        { _id: 'first', owner: 'expired', request_type: 'allocation', request_status: 'paused_ineligible', requested_at: new Date('2026-01-01') },
        { _id: 'done', owner: 'active', request_type: 'allocation', request_status: 'cancelled', requested_at: new Date('2024-01-01') },
      ],
      members: [
        { _id: 'active', name: 'Ada', mid: 'M1', lab: new Date('2027-01-01') },
        { _id: 'expired', name: 'Grace', mid: 'M2', lab: new Date('2026-01-01') },
      ],
      units: [{ _id: 'unit', name: 'A-42', owner: 'active', availability_status: 'occupied' }],
    });
    assert.deepStrictEqual(rows.map(({ _id }) => _id), ['first', 'later']);
    assert.strictEqual(rows[0].eligibilityLabel, 'Not eligible');
    assert.strictEqual(rows[0].pauseLabel, 'Paused');
    assert.strictEqual(rows[0].currentUnit, '—');
    assert.strictEqual(rows[1].currentUnit, 'A-42');
    assert.strictEqual(rows[1].preferenceLabel, 'Floor 2 · High');
    assert.strictEqual(rows[1].requestLabel, 'Different unit');
  });

  it('labels partial and empty storage preferences clearly', function () {
    assert.strictEqual(storagePreferenceLabel({ floor: 'floor1' }), 'Floor 1');
    assert.strictEqual(storagePreferenceLabel({ height: 'low' }), 'Low');
    assert.strictEqual(storagePreferenceLabel(), 'Any available unit');
  });

  it('searches the queue by member name, number, or email independently', function () {
    const rows = [
      { _id: 'ada', memberName: 'Ada Lovelace', memberNumber: 'M42', memberEmail: 'ada@example.com' },
      { _id: 'grace', memberName: 'Grace Hopper', memberNumber: 'M99', memberEmail: 'grace@example.com' },
    ];
    assert.deepStrictEqual(filterStorageQueue(rows, 'lovelace').map(({ _id }) => _id), ['ada']);
    assert.deepStrictEqual(filterStorageQueue(rows, 'm99').map(({ _id }) => _id), ['grace']);
    assert.deepStrictEqual(filterStorageQueue(rows, 'ADA@EXAMPLE').map(({ _id }) => _id), ['ada']);
    assert.strictEqual(filterStorageQueue(rows, ''), rows);
  });

  it('only offers eligibility pause transitions that the server accepts', function () {
    const now = new Date('2026-09-11T12:00:00Z');
    const rows = storageQueueRows({
      now,
      requests: [
        { _id: 'eligible-active', owner: 'eligible', request_type: 'allocation', request_status: 'waiting', requested_at: now },
        { _id: 'eligible-paused', owner: 'eligible', request_type: 'allocation', request_status: 'paused_ineligible', requested_at: now },
        { _id: 'expired-active', owner: 'expired', request_type: 'allocation', request_status: 'waiting', requested_at: now },
        { _id: 'expired-paused', owner: 'expired', request_type: 'allocation', request_status: 'paused_ineligible', requested_at: now },
      ],
      members: [
        { _id: 'eligible', lab: new Date('2027-01-01') },
        { _id: 'expired', lab: new Date('2026-01-01') },
      ],
    });
    const byId = Object.fromEntries(rows.map((row) => [row._id, row]));
    assert.strictEqual(byId['eligible-active'].canTogglePause, false);
    assert.strictEqual(byId['eligible-paused'].canTogglePause, true);
    assert.strictEqual(byId['expired-active'].canTogglePause, true);
    assert.strictEqual(byId['expired-paused'].canTogglePause, false);
  });

  it('compares preview identities', function () {
    assert(sameSuggestionSet([{ suggestion_id: 'b' }, { suggestion_id: 'a' }], [{ suggestion_id: 'a' }, { suggestion_id: 'b' }]));
    assert(!sameSuggestionSet([{ suggestion_id: 'a' }], []));
  });

  it('uses authoritative readiness and presents every blocker in plain language', function () {
    const source = {
      allocation_ready: false,
      allocation_blocked_reasons: [
        'legacy_source_changed_after_migration',
        'migration_manifest_incomplete',
        'cutover_finalization_invalid',
        'cutover_not_finalized',
        'transactions_unavailable',
      ],
    };
    const view = storageReadinessPresentation(source);
    assert.strictEqual(view.state, 'blocked');
    assert.deepStrictEqual(view.reasons, [
      'Legacy storage data changed after migration.',
      'One or more migrated storage records are missing.',
      'The storage migration cutover record is invalid.',
      'The storage migration cutover has not been finalized.',
      'MongoDB transaction support is required for storage changes.',
    ]);
    const metadata = storageReadinessPresentation({
      allocation_ready: false,
      allocation_blocked_reasons: ['unclassified_units'],
      unclassified_unit_ids: ['a'],
    });
    assert.strictEqual(metadata.state, 'metadata');
    const mixed = storageReadinessPresentation({
      allocation_ready: false,
      allocation_blocked_reasons: ['unclassified_units', 'migration_manifest_invalid'],
    });
    assert.strictEqual(mixed.state, 'blocked');
    assert.strictEqual(storageReadinessPresentation({ allocation_ready: true, allocation_blocked_reasons: [] }).state, 'ready');
  });

  it('requires acknowledgement when bulk height affects occupied or reserved units', function () {
    const impact = bulkHeightImpact(units, ['a', 'b', 'missing']);
    assert.deepStrictEqual(impact, { selectedCount: 2, protectedCount: 1, requiresAcknowledgement: true });
    assert.strictEqual(bulkHeightImpact(units, ['a']).requiresAcknowledgement, false);
  });

  it('joins every result status to the exact confirmed row', function () {
    const rows = [{ suggestion_id: 'one', member_name: 'Ada', unit_name: 'A-1' }];
    const labels = {
      applied: 'Applied', already_applied: 'Already applied', stale: 'Needs review',
      conflict: 'Needs review', failed: 'Failed',
    };
    for (const status of ['applied', 'already_applied', 'stale', 'conflict', 'failed']) {
      assert.deepStrictEqual(
        joinStorageResults([{ suggestion_id: 'one', status }], rows)[0],
        { suggestion_id: 'one', status, label: 'Ada · A-1', statusLabel: labels[status] },
      );
    }
  });

  it('summarizes batches and labels every bulk result by unit', function () {
    assert.strictEqual(storageResultSummary([
      { status: 'applied' }, { status: 'already_applied' },
      { status: 'conflict' }, { status: 'failed' },
    ]), '2 applied · 1 need review · 1 failed');
    assert.deepStrictEqual(joinBulkHeightResults([
      { unitId: 'a', status: 'updated' },
      { unitId: 'missing', status: 'failed', reason: 'Gone' },
    ], units), [
      { unitId: 'a', status: 'updated', label: '1', statusClass: 'applied', statusLabel: 'Updated' },
      { unitId: 'missing', status: 'failed', reason: 'Gone', label: 'Unknown unit', statusClass: 'failed', statusLabel: 'Failed' },
    ]);
    assert.strictEqual(storageActionReasonLabel('warning_deadline_passed'), 'The 28-day warning deadline passed');
    assert.strictEqual(storageActionReasonLabel('unexpected_reason'), 'unexpected reason');
  });

  it('resolves member and unit event filters through historical storage records', function () {
    const records = { events: [
      { entity_id: 'a1', member: 'm1', unit: 'u1' },
      { entity_id: 'a2', member: 'm2', unit: 'u1' },
      { entity_id: 'mv1', member: 'm1', unit: 'u2', related_unit: 'u1' },
    ] };
    assert.deepStrictEqual(
      storageEventEntityIds({ memberId: 'm1', ...records }),
      ['a1', 'mv1'],
    );
    assert.deepStrictEqual(
      storageEventEntityIds({ unitId: 'u1', ...records }),
      ['a1', 'a2', 'mv1'],
    );
    assert.deepStrictEqual(
      storageEventEntityIds({ memberId: 'm1', unitId: 'u1', ...records }),
      ['a1', 'mv1'],
    );
    assert.deepStrictEqual(storageEventEntityIds({ memberId: 'm2', unitId: 'u2', ...records }), []);
    assert.strictEqual(storageEventEntityIds(records), null);
  });

  it('presents event rows with related member and storage-unit names', function () {
    const rows = storageEventRows({
      events: [
        { _id: 'older', entity_type: 'storageUnit', entity_id: 'u1', event_type: 'unit_assigned', actor_type: 'administrator', actor: 'admin-user', member: 'm1', unit: 'u1', occurred_at: new Date('2026-09-10') },
        { _id: 'newer', entity_type: 'storageOffer', entity_id: 'offer1', event_type: 'offer_created', actor_type: 'member', actor: 'member-user', member: 'm1', unit: 'u2', related_unit: 'u1', occurred_at: new Date('2026-09-11') },
      ],
      members: [
        { _id: 'm1', name: 'Ada Lovelace', email: 'ada@example.com' },
        { _id: 'admin-member', name: 'Admin User', email: 'admin@example.com' },
      ],
      users: [
        { _id: 'member-user', emails: [{ address: 'Ada@example.com' }] },
        { _id: 'admin-user', emails: [{ address: 'admin@example.com' }] },
      ],
      units: [{ _id: 'u1', name: '1001' }, { _id: 'u2', name: '2001' }],
    });
    assert.deepStrictEqual(rows.map(({ _id }) => _id), ['newer', 'older']);
    assert.strictEqual(rows[0].memberLabel, 'Ada Lovelace');
    assert.strictEqual(rows[0].unitLabel, '1001, 2001');
    assert.strictEqual(rows[0].eventLabel, 'Offer created');
    assert.strictEqual(rows[0].actorLabel, 'Member · Ada Lovelace');
    assert.strictEqual(rows[1].actorLabel, 'Administrator · Admin User');
  });

  it('uses readable system actor labels and never exposes an unknown actor id', function () {
    const [seed] = storageEventRows({ events: [{
      _id: 'seed', entity_type: 'storageMigration', entity_id: 'migration',
      event_type: 'legacy_storage_migration_applied', actor_type: 'system',
      actor: '__e2e_seed__', occurred_at: new Date('2026-09-11'),
    }] });
    assert.strictEqual(seed.actorLabel, 'System · Test data setup');
    const [unknown] = storageEventRows({ events: [{
      _id: 'unknown', entity_type: 'storageUnit', entity_id: 'u1',
      event_type: 'unit_updated', actor_type: 'administrator',
      actor: 'opaque-database-id', occurred_at: new Date('2026-09-11'),
    }] });
    assert.strictEqual(unknown.actorLabel, 'Administrator');
  });
});
