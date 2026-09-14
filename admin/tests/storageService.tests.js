import assert from 'assert';
import { Meteor } from 'meteor/meteor';
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
  units: [], requests: [], offers: [], messages: [], members: [],
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
    const snapshot = JSON.stringify(state);
    const result = buildStorageSuggestions('allocate', state, now);
    assert.strictEqual(result.rows[0].decision_type, 'assignment');
    assert.strictEqual(result.rows[1].decision_type, 'move');
    assert.strictEqual(JSON.stringify(state), snapshot);
  });

  it('reports email as unavailable when mail delivery is disabled', function () {
    const originalDeliverMails = Meteor.settings.deliverMails;
    const state = emptyState();
    state.members = [member('new')];
    state.units = [unit('free')];
    state.requests = [{
      _id: 'r1', owner: 'new', request_type: 'allocation', request_status: 'waiting',
      requested_at: new Date('2026-01-01'), updatedAt: timestamp,
    }];
    try {
      Meteor.settings.deliverMails = false;
      assert.strictEqual(
        buildStorageSuggestions('allocate', state, now).rows[0].expected_channels.email,
        'unavailable',
      );
      Meteor.settings.deliverMails = true;
      assert.strictEqual(
        buildStorageSuggestions('allocate', state, now).rows[0].expected_channels.email,
        'available',
      );
    } finally {
      Meteor.settings.deliverMails = originalDeliverMails;
    }
  });

  it('excludes an exempt overdue assignment from warnings', function () {
    const state = emptyState();
    state.members = [member('owner', null)];
    state.units = [{ ...unit('box', 'occupied', 'owner'), exemption: {
      reason: 'Internal reason', created_at: timestamp, created_by: 'admin',
    } }];
    const result = buildStorageSuggestions('warn', state, now);
    assert.strictEqual(result.rows.length, 0);
    assert.strictEqual(result.skipped[0].reason_code, 'active_exemption');
  });

  it('suggests one reminder and then reclamation, not both at the deadline', function () {
    const state = emptyState();
    state.members = [member('owner', null)];
    state.units = [{ ...unit('box', 'occupied', 'owner'), warning: {
      id: 'warning',
      warned_at: new Date('2026-08-13T12:00:00.000Z'), deadline_at: now, updatedAt: timestamp,
    } }];
    const before = new Date('2026-09-03T12:00:00.000Z');
    assert.strictEqual(buildStorageSuggestions('remind', state, before).rows.length, 1);
    assert.strictEqual(buildStorageSuggestions('remind', state, now).rows.length, 0);
    const manualContact = buildStorageSuggestions('reclaim', state, now).rows[0];
    assert.strictEqual(manualContact.manual_contact_required, true);
    assert.strictEqual(manualContact.warning_delivered, false);
    state.messages.push({
      _id: 'storage-notification:warning:warning', type: 'storage', senddate: timestamp,
    });
    const delivered = buildStorageSuggestions('reclaim', state, now).rows[0];
    assert.strictEqual(delivered.manual_contact_required, false);
    assert.strictEqual(delivered.warning_delivered, true);
    assert.notStrictEqual(delivered.suggestion_id, manualContact.suggestion_id);
    state.units[0].warning.reminded_at = timestamp;
    assert.strictEqual(buildStorageSuggestions('remind', state, before).rows.length, 0);
  });

  it('builds release, expired-move, and clearance suggestions', function () {
    const state = emptyState();
    state.members = [member('owner')];
    state.units = [unit('source', 'occupied', 'owner'), unit('destination', 'reserved', 'owner'), unit('clear', 'awaiting_clearance', 'owner')];
    state.requests = [{
      _id: 'release', owner: 'owner', request_type: 'release', request_status: 'waiting',
      source_unit: 'source', requested_at: timestamp, updatedAt: timestamp,
    }];
    state.offers = [{
      _id: 'move', owner: 'owner', request: 'release',
      from_unit: 'source', to_unit: 'destination', deadline_at: now, updatedAt: timestamp,
    }];
    assert.strictEqual(buildStorageSuggestions('release', state, now).rows.length, 1);
    assert.strictEqual(buildStorageSuggestions('review_expired_offers', state, now).rows.length, 1);
    assert.strictEqual(buildStorageSuggestions('confirm_clearance', state, now).rows.length, 1);
  });

});
