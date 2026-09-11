import assert from 'assert';
import {
  buildStorageSuggestions,
  storageSuggestionId,
} from '/imports/common/server/storage/suggestions';

const now = new Date('2026-09-10T12:00:00.000Z');
const timestamp = new Date('2026-09-01T12:00:00.000Z');
const member = (id, lab = '2027-01-01T00:00:00.000Z') => ({
  _id: id, name: id, email: `${id}@example.com`, mobile: '0701234567',
  ...(lab ? { lab: new Date(lab) } : {}),
});
const unit = (id, status = 'available', owner) => ({
  _id: id, name: id, floor: 'floor1', height: 'low', wall_id: 'wall', column: 1, row: 1,
  availability_status: status, ...(owner ? { owner } : {}), updatedAt: timestamp,
});
const emptyState = () => ({
  units: [], requests: [], assignments: [], warnings: [], exemptions: [], moves: [], deliveries: [], members: [],
});

describe('storage server suggestions', function () {
  it('fingerprints authoritative versions and membership dates', function () {
    const a = storageSuggestionId('warn', { owner: 'm:2026-01-01' });
    const b = storageSuggestionId('warn', { owner: 'm:2026-01-02' });
    assert.strictEqual(a.length, 64);
    assert.notStrictEqual(a, b);
    assert.strictEqual(a, storageSuggestionId('warn', { owner: 'm:2026-01-01' }));
  });

  it('builds assignment and move rows without mutating input', function () {
    const state = emptyState();
    state.members = [member('new'), member('moving')];
    state.units = [
      unit('free'),
      { ...unit('old', 'occupied', 'moving'), height: 'high', column: 2 },
      { ...unit('destination'), _id: 'destination', name: 'destination', column: 3 },
    ];
    state.requests = [
      { _id: 'r1', owner: 'new', request_type: 'allocation', request_status: 'waiting', requested_at: new Date('2026-01-01'), updatedAt: timestamp },
      { _id: 'r2', owner: 'moving', request_type: 'move', request_status: 'waiting', requested_at: new Date('2026-01-02'), preference: { height: 'low' }, updatedAt: timestamp },
    ];
    state.assignments = [{ _id: 'a', owner: 'moving', unit: 'old', assigned_at: timestamp, updatedAt: timestamp }];
    const snapshot = JSON.stringify(state);
    const result = buildStorageSuggestions('allocate', state, now);
    assert.strictEqual(result.rows[0].decision_type, 'assignment');
    assert.strictEqual(result.rows[1].decision_type, 'move');
    assert.strictEqual(JSON.stringify(state), snapshot);
  });

  it('excludes an exempt overdue assignment from warnings', function () {
    const state = emptyState();
    state.members = [member('owner', null)];
    state.units = [unit('box', 'occupied', 'owner')];
    state.assignments = [{ _id: 'assignment', owner: 'owner', unit: 'box', assigned_at: timestamp, updatedAt: timestamp }];
    state.exemptions = [{ _id: 'exemption', assignment: 'assignment', active: true, updatedAt: timestamp }];
    const result = buildStorageSuggestions('warn', state, now);
    assert.strictEqual(result.rows.length, 0);
    assert.strictEqual(result.skipped[0].reason_code, 'active_exemption');
  });

  it('suggests one reminder and then reclamation, not both at the deadline', function () {
    const state = emptyState();
    state.members = [member('owner', null)];
    state.units = [unit('box', 'occupied', 'owner')];
    state.assignments = [{ _id: 'assignment', owner: 'owner', unit: 'box', assigned_at: timestamp, updatedAt: timestamp }];
    state.warnings = [{
      _id: 'warning', assignment: 'assignment', owner: 'owner', warning_status: 'open',
      warned_at: new Date('2026-08-13T12:00:00.000Z'), deadline_at: now, updatedAt: timestamp,
    }];
    const before = new Date('2026-09-03T12:00:00.000Z');
    assert.strictEqual(buildStorageSuggestions('remind', state, before).rows.length, 1);
    assert.strictEqual(buildStorageSuggestions('remind', state, now).rows.length, 0);
    assert.strictEqual(buildStorageSuggestions('reclaim', state, now).rows.length, 1);
    state.deliveries = [{ decision_type: 'reminder', decision_id: 'warning' }];
    assert.strictEqual(buildStorageSuggestions('remind', state, before).rows.length, 0);
  });

  it('builds release, expired-move, and clearance suggestions', function () {
    const state = emptyState();
    state.members = [member('owner')];
    state.units = [unit('source', 'occupied', 'owner'), unit('destination', 'reserved', 'owner'), unit('clear', 'awaiting_clearance', 'owner')];
    state.assignments = [{ _id: 'assignment', owner: 'owner', unit: 'source', assigned_at: timestamp, updatedAt: timestamp }];
    state.requests = [{
      _id: 'release', owner: 'owner', request_type: 'release', request_status: 'waiting',
      source_assignment: 'assignment', requested_at: timestamp, updatedAt: timestamp,
    }];
    state.moves = [{
      _id: 'move', owner: 'owner', request: 'release', from_assignment: 'assignment',
      from_unit: 'source', to_unit: 'destination', move_status: 'pending', deadline_at: now, updatedAt: timestamp,
    }];
    assert.strictEqual(buildStorageSuggestions('release', state, now).rows.length, 1);
    assert.strictEqual(buildStorageSuggestions('review_expired_moves', state, now).rows.length, 1);
    assert.strictEqual(buildStorageSuggestions('confirm_clearance', state, now).rows.length, 1);
  });

  it('offers explicit render recovery alongside failed delivery channels', function () {
    const state = emptyState();
    state.members = [member('owner')];
    state.deliveries = [{
      _id: 'delivery', owner: 'owner', render_status: 'missing_template',
      email: { status: 'unavailable' }, sms: { status: 'failed' }, updatedAt: timestamp,
    }];
    const result = buildStorageSuggestions('retry_notifications', state, now);
    assert.deepStrictEqual(result.rows[0].failed_channels, ['render', 'sms']);
  });
});
