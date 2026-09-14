import assert from 'assert';
import {
  failedChannels,
  bulkHeightImpact,
  filterStorageQueue,
  filterStorageUnits,
  groupStorageWalls,
  joinStorageResults,
  sameSuggestionSet,
  storageMemberLabel,
  storagePreferenceLabel,
  storageQueueRows,
  storageReadinessPresentation,
} from '/imports/storage/presentation';
import { storageEventEntityIds, storageEventRows } from '/imports/storage/eventLog';

describe('storage admin presentation', function () {
  const units = [
    { _id: 'b', name: '2', wall: 'B', position: 2, floor: 'floor2', availability_status: 'occupied', owner: 'm' },
    { _id: 'a', name: '1', wall: 'A', position: 1, floor: 'floor1', availability_status: 'available' },
    { _id: 'c', name: '3', wall: 'B', position: 1, floor: 'floor2', height: 'high', availability_status: 'available', note: 'repair' },
  ];

  it('filters inventory without changing source order', function () {
    assert.deepStrictEqual(filterStorageUnits(units, { height: 'unclassified' }).map((x) => x._id), ['b', 'a']);
    assert.deepStrictEqual(filterStorageUnits(units, { query: 'repair' }).map((x) => x._id), ['c']);
    assert.strictEqual(units[0]._id, 'b');
  });

  it('groups walls and sorts physical positions', function () {
    const walls = groupStorageWalls(units, [{ name: 'B', shelfSize: 2 }]);
    assert.deepStrictEqual(walls.map((wall) => wall.name), ['A', 'B']);
    assert.deepStrictEqual(walls[1].units.map((unit) => unit._id), ['c', 'b']);
    assert.deepStrictEqual(walls[1].shelves[0].columns.map((column) =>
      column.units.map((unit) => unit._id)), [['c'], ['b']]);
    assert.strictEqual(walls[0].shelves.length, 1);
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
      assignments: [{ _id: 'assignment', owner: 'active', unit: 'unit' }],
      units: [{ _id: 'unit', name: 'A-42' }],
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

  it('compares preview identities and finds failed channels', function () {
    assert(sameSuggestionSet([{ suggestion_id: 'b' }, { suggestion_id: 'a' }], [{ suggestion_id: 'a' }, { suggestion_id: 'b' }]));
    assert(!sameSuggestionSet([{ suggestion_id: 'a' }], []));
    assert.deepStrictEqual(failedChannels({ render_status: 'missing_template', email: { status: 'sent' }, sms: { status: 'failed' } }), ['render', 'sms']);
    assert.deepStrictEqual(failedChannels({ render_status: 'render_failed', email: { status: 'failed' }, sms: { status: 'sent' } }), ['render', 'email']);
    assert.deepStrictEqual(failedChannels({ render_status: 'rendered', email: { status: 'sent' }, sms: { status: 'sent' } }), []);
  });

  it('uses authoritative readiness and preserves every blocker verbatim', function () {
    for (const reason of [
      'legacy_source_changed_after_migration',
      'migration_manifest_incomplete',
      'cutover_finalization_invalid',
    ]) {
      const source = { allocation_ready: false, allocation_blocked_reasons: [reason] };
      const view = storageReadinessPresentation(source);
      assert.strictEqual(view.state, 'blocked');
      assert.strictEqual(view.reasons, source.allocation_blocked_reasons);
    }
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
    for (const status of ['applied', 'already_applied', 'stale', 'conflict', 'failed']) {
      assert.deepStrictEqual(
        joinStorageResults([{ suggestion_id: 'one', status }], rows)[0],
        { suggestion_id: 'one', status, label: 'Ada · A-1' },
      );
    }
  });

  it('resolves member and unit event filters through historical storage records', function () {
    const records = {
      assignments: [
        { _id: 'a1', owner: 'm1', unit: 'u1', request: 'r1' },
        { _id: 'a2', owner: 'm2', unit: 'u1', request: 'r2' },
      ],
      requests: [
        { _id: 'r1', owner: 'm1' }, { _id: 'r2', owner: 'm2' }, { _id: 'r3', owner: 'm1' },
      ],
      warnings: [
        { _id: 'w1', owner: 'm1', assignment: 'a1' },
        { _id: 'w2', owner: 'm2', assignment: 'a2' },
      ],
      exemptions: [{ _id: 'e1', assignment: 'a1' }],
      moves: [{ _id: 'mv1', owner: 'm1', from_unit: 'u1', to_unit: 'u2', from_assignment: 'a1', request: 'r3' }],
    };
    assert.deepStrictEqual(
      storageEventEntityIds({ memberId: 'm1', ...records }),
      ['a1', 'e1', 'mv1', 'r1', 'r3', 'w1'],
    );
    assert.deepStrictEqual(
      storageEventEntityIds({ unitId: 'u1', ...records }),
      ['a1', 'a2', 'e1', 'mv1', 'r1', 'r2', 'r3', 'u1', 'w1', 'w2'],
    );
    assert.deepStrictEqual(
      storageEventEntityIds({ memberId: 'm1', unitId: 'u1', ...records }),
      ['a1', 'e1', 'mv1', 'r1', 'r3', 'w1'],
    );
    assert.deepStrictEqual(storageEventEntityIds({ memberId: 'm2', unitId: 'u2', ...records }), []);
    assert.strictEqual(storageEventEntityIds(records), null);
  });

  it('presents event rows with related member and storage-unit names', function () {
    const rows = storageEventRows({
      events: [
        { _id: 'older', entity_type: 'storageAssignment', entity_id: 'a1', event_type: 'assignment_created', actor_type: 'administrator', actor: 'admin-user', occurred_at: new Date('2026-09-10') },
        { _id: 'newer', entity_type: 'storageMove', entity_id: 'mv1', event_type: 'move_reserved', actor_type: 'member', actor: 'member-user', occurred_at: new Date('2026-09-11'), details: { to_unit: 'u2' } },
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
      assignments: [{ _id: 'a1', owner: 'm1', unit: 'u1' }],
      moves: [{ _id: 'mv1', owner: 'm1', from_unit: 'u1', to_unit: 'u2', from_assignment: 'a1' }],
    });
    assert.deepStrictEqual(rows.map(({ _id }) => _id), ['newer', 'older']);
    assert.strictEqual(rows[0].memberLabel, 'Ada Lovelace');
    assert.strictEqual(rows[0].unitLabel, '1001, 2001');
    assert.strictEqual(rows[0].eventLabel, 'Move reserved');
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
