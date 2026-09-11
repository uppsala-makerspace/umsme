import assert from 'assert';
import {
  desiredStorageRequestStatus,
  hasActiveLabMembershipAt,
  isStorageExemptionActive,
  isStorageMoveReviewDue,
  isStorageReclamationEligible,
  isStorageReminderEligible,
  legacyStoragePreference,
  preferenceSpecificity,
  proposeStorageAllocations,
  resolveStorageOwner,
  storageMoveDeadline,
  storagePreferenceMatches,
  storageReminderAt,
  storageDeliveryStateErrors,
  storageExemptionDeactivationReason,
  storageLayoutErrors,
  storageStateErrors,
  storageUnitStateErrors,
  storageWarningDeadline,
} from '/imports/common/lib/storageRules';

const d = (value) => new Date(value);
const NOW = d('2026-09-10T12:00:00.000Z');
const member = (id, lab = '2027-01-01T00:00:00.000Z', extra = {}) => ({
  _id: id,
  ...(lab ? { lab: d(lab) } : {}),
  ...extra,
});
const unit = (id, floor, height, extra = {}) => ({
  _id: id,
  name: id,
  floor,
  height,
  availability_status: 'available',
  ...extra,
});
const request = (id, owner, requestedAt, preference, requestType = 'allocation') => ({
  _id: id,
  owner,
  request_type: requestType,
  request_status: 'waiting',
  requested_at: d(requestedAt),
  ...(preference ? { preference } : {}),
});

describe('storageRules', function () {
  describe('family ownership and eligibility', function () {
    it('resolves a dependent to the paying member', function () {
      const payer = member('payer');
      const dependent = member('dependent', null, { infamily: 'payer' });
      assert.deepStrictEqual(resolveStorageOwner(dependent, { payer, dependent }), {
        owner: payer,
        error: null,
      });
    });

    it('reports missing, cyclic, and nested family relationships', function () {
      const missing = member('missing', null, { infamily: 'nobody' });
      assert.strictEqual(resolveStorageOwner(missing, { missing }).error, 'family_payer_missing');

      const a = member('a', null, { infamily: 'b' });
      const b = member('b', null, { infamily: 'a' });
      assert.strictEqual(resolveStorageOwner(a, { a, b }).error, 'family_cycle');

      const child = member('child', null, { infamily: 'middle' });
      const middle = member('middle', null, { infamily: 'payer' });
      const payer = member('payer');
      assert.strictEqual(resolveStorageOwner(child, { child, middle, payer }).error, 'nested_family');
      assert.strictEqual(resolveStorageOwner(child, { child, middle, payer }).owner, payer);
    });

    it('treats a lab end exactly at now as inactive', function () {
      assert.strictEqual(hasActiveLabMembershipAt(member('active', '2026-09-10T12:00:00.001Z'), NOW), true);
      assert.strictEqual(hasActiveLabMembershipAt(member('ended', NOW.toISOString()), NOW), false);
      assert.strictEqual(desiredStorageRequestStatus('allocation', false), 'paused_ineligible');
      assert.strictEqual(desiredStorageRequestStatus('release', false), 'waiting');
    });
  });

  describe('preferences', function () {
    it('maps every legacy preference', function () {
      assert.deepStrictEqual(legacyStoragePreference('floor1'), { preference: { floor: 'floor1' } });
      assert.deepStrictEqual(legacyStoragePreference('floor1L'), { preference: { floor: 'floor1', height: 'low' } });
      assert.deepStrictEqual(legacyStoragePreference('floor2U'), { preference: { floor: 'floor2', height: 'high' } });
      assert.deepStrictEqual(legacyStoragePreference('none'), { release: true });
      assert.deepStrictEqual(legacyStoragePreference(), { preference: undefined });
      assert.strictEqual(legacyStoragePreference('basement').error, 'invalid_preference');
    });

    it('matches all specified components and counts specificity', function () {
      const low = unit('1', 'floor1', 'low');
      assert.strictEqual(storagePreferenceMatches(low), true);
      assert.strictEqual(storagePreferenceMatches(low, { floor: 'floor1' }), true);
      assert.strictEqual(storagePreferenceMatches(low, { height: 'low' }), true);
      assert.strictEqual(storagePreferenceMatches(low, { floor: 'floor2' }), false);
      assert.strictEqual(storagePreferenceMatches(low, { floor: 'floor1', height: 'high' }), false);
      assert.strictEqual(preferenceSpecificity({ floor: 'floor1', height: 'low' }), 2);
    });
  });

  describe('allocation', function () {
    it('runs compatible, soft-fallback, and compatible-move phases in order', function () {
      const units = [
        unit('1-low', 'floor1', 'low'),
        unit('1-high', 'floor1', 'high'),
        unit('2-low', 'floor2', 'low'),
        unit('old', 'floor1', 'high', { availability_status: 'occupied', owner: 'moving' }),
      ];
      const requests = [
        request('compatible', 'compatible', '2026-01-01', { floor: 'floor1', height: 'low' }),
        request('fallback', 'fallback', '2026-01-02', { floor: 'floor9' }),
        request('move', 'moving', '2026-01-03', { floor: 'floor2', height: 'low' }, 'move'),
      ];
      const assignments = [{ _id: 'assignment', unit: 'old', owner: 'moving' }];
      const members = {
        compatible: member('compatible'),
        fallback: member('fallback'),
        moving: member('moving'),
      };
      const result = proposeStorageAllocations({ units, requests, assignments, members, now: NOW });
      assert.deepStrictEqual(result.proposals.map((p) => [p.request._id, p.unit._id, p.phase]), [
        ['compatible', '1-low', 1],
        ['fallback', '1-high', 2],
        ['move', '2-low', 3],
      ]);
    });

    it('excludes ineligible members and units that are unclassified or unavailable', function () {
      const result = proposeStorageAllocations({
        units: [
          unit('unclassified', 'floor1', undefined),
          unit('blocked', 'floor1', 'low', { availability_status: 'unavailable' }),
          unit('good', 'floor1', 'high'),
        ],
        requests: [
          request('expired', 'expired', '2025-01-01'),
          request('active', 'active', '2025-01-02'),
        ],
        members: { expired: member('expired', null), active: member('active') },
        now: NOW,
      });
      assert.deepStrictEqual(result.proposals.map((p) => [p.request._id, p.unit._id]), [['active', 'good']]);
    });

    it('does not move someone whose current unit already satisfies the preference', function () {
      const result = proposeStorageAllocations({
        units: [unit('free', 'floor1', 'low'), unit('current', 'floor1', 'low', { availability_status: 'occupied', owner: 'm' })],
        requests: [request('move', 'm', '2025-01-01', { floor: 'floor1', height: 'low' }, 'move')],
        assignments: [{ _id: 'a', unit: 'current', owner: 'm' }],
        members: { m: member('m') },
        now: NOW,
      });
      assert.strictEqual(result.proposals.length, 0);
      assert.strictEqual(result.skipped[0].reason, 'no_beneficial_compatible_unit');
    });

    it('uses specificity and stable identifiers to break ties deterministically', function () {
      const units = [unit('b', 'floor1', 'high'), unit('a', 'floor1', 'low')];
      const requests = [
        request('broad', 'broad', '2026-01-01', { floor: 'floor1' }),
        request('narrow', 'narrow', '2026-01-01', { floor: 'floor1', height: 'low' }),
      ];
      const members = { broad: member('broad'), narrow: member('narrow') };
      const forward = proposeStorageAllocations({ units, requests, members, now: NOW });
      const reversed = proposeStorageAllocations({ units: [...units].reverse(), requests: [...requests].reverse(), members, now: NOW });
      const shape = (result) => result.proposals.map((p) => [p.request._id, p.unit._id]);
      assert.deepStrictEqual(shape(forward), [['narrow', 'a'], ['broad', 'b']]);
      assert.deepStrictEqual(shape(reversed), shape(forward));
    });

    it('preserves no-storage compatibility before considering move demand', function () {
      const units = [unit('a', 'floor1', 'low'), unit('b', 'floor2', 'high')];
      const requests = [
        request('oldest', 'oldest', '2026-01-01', undefined),
        request('next', 'next', '2026-01-02', { floor: 'floor1', height: 'low' }),
        request('move', 'moving', '2026-01-03', { floor: 'floor2', height: 'high' }, 'move'),
      ];
      const current = unit('current', 'floor1', 'high', {
        availability_status: 'occupied',
        owner: 'moving',
      });
      const members = {
        oldest: member('oldest'),
        next: member('next'),
        moving: member('moving'),
      };
      const result = proposeStorageAllocations({
        units: [...units, current],
        requests,
        assignments: [{ _id: 'assignment', unit: 'current', owner: 'moving' }],
        members,
        now: NOW,
      });
      assert.deepStrictEqual(result.proposals.map((proposal) => [proposal.request._id, proposal.unit._id]), [
        ['oldest', 'b'],
        ['next', 'a'],
      ]);
    });
  });

  describe('deadlines and states', function () {
    const warning = {
      warning_status: 'open',
      warned_at: d('2026-08-13T12:00:00.000Z'),
      deadline_at: NOW,
    };

    it('uses exact 21, 28, and 14 day elapsed durations', function () {
      assert.strictEqual(storageReminderAt(warning.warned_at).toISOString(), '2026-09-03T12:00:00.000Z');
      assert.strictEqual(storageWarningDeadline(warning.warned_at).toISOString(), NOW.toISOString());
      assert.strictEqual(storageMoveDeadline(d('2026-08-27T12:00:00.000Z')).toISOString(), NOW.toISOString());
      assert.strictEqual(isStorageMoveReviewDue({ move_status: 'pending', deadline_at: NOW }, NOW), true);
    });

    it('suggests one reminder before the deadline and reclamation at the deadline', function () {
      assert.strictEqual(isStorageReminderEligible(warning, { now: d('2026-09-03T12:00:00.000Z') }), true);
      assert.strictEqual(isStorageReminderEligible(warning, { now: NOW }), false);
      assert.strictEqual(isStorageReminderEligible(warning, { now: d('2026-09-04'), reminderAlreadySent: true }), false);
      assert.strictEqual(isStorageReclamationEligible(warning, { now: NOW }), true);
      assert.strictEqual(isStorageReclamationEligible(warning, { now: NOW, labIsActive: true }), false);
    });

    it('honours active exemptions and expires them at the exact end time', function () {
      const active = { active: true, exempt_until: d('2026-09-10T12:00:00.001Z') };
      const expired = { active: true, exempt_until: NOW };
      assert.strictEqual(isStorageExemptionActive(active, NOW), true);
      assert.strictEqual(isStorageExemptionActive(expired, NOW), false);
      assert.strictEqual(isStorageReclamationEligible(warning, { now: NOW, exemption: active }), false);
      assert.strictEqual(isStorageReclamationEligible(warning, { now: NOW, exemption: expired }), true);
      assert.strictEqual(isStorageExemptionActive({ ...active, active: false }, NOW), false);
      assert.strictEqual(storageExemptionDeactivationReason(expired, NOW), 'expired');
      assert.strictEqual(storageExemptionDeactivationReason({ ...active, revoked_at: NOW }, NOW), 'revoked');
    });

    it('validates ownership implied by availability status', function () {
      assert.deepStrictEqual(storageUnitStateErrors({ availability_status: 'occupied' }), ['owner_required']);
      assert.deepStrictEqual(storageUnitStateErrors({ availability_status: 'available', owner: 'm' }), ['owner_forbidden']);
      assert.deepStrictEqual(storageUnitStateErrors({ availability_status: 'reserved', owner: 'm' }), []);
    });

    it('validates wall references, coordinates, and floor consistency', function () {
      const walls = [{ _id: 'wall', floor: 'floor1', column_count: 2, row_count: 5 }];
      const errors = storageLayoutErrors({ walls, units: [
        { _id: 'valid', wall_id: 'wall', floor: 'floor1', column: 1, row: 5 },
        { _id: 'duplicate', wall_id: 'wall', floor: 'floor1', column: 1, row: 5 },
        { _id: 'outside', wall_id: 'wall', floor: 'floor1', column: 3, row: 1 },
        { _id: 'wrong-floor', wall_id: 'wall', floor: 'floor2', column: 2, row: 1 },
        { _id: 'orphan', wall_id: 'missing', floor: 'floor1', column: 1, row: 1 },
      ] });
      assert.deepStrictEqual(errors.map(({ code }) => code), [
        'duplicate_unit_coordinate', 'unit_outside_wall_layout',
        'unit_wall_floor_mismatch', 'unit_wall_missing',
      ]);
    });

    it('reports duplicate and cross-document state violations', function () {
      const errors = storageStateErrors({
        units: [
          unit('occupied', 'floor1', 'low', { availability_status: 'occupied', owner: 'right' }),
          unit('reserved', 'floor1', 'high', { availability_status: 'reserved', owner: 'right' }),
        ],
        assignments: [
          { _id: 'a1', unit: 'occupied', owner: 'wrong' },
          { _id: 'a2', unit: 'other', owner: 'wrong' },
        ],
        moves: [],
      });
      const codes = errors.map((error) => error.code);
      assert.ok(codes.includes('duplicate_active_assignment_owner'));
      assert.ok(codes.includes('assignment_owner_mismatch'));
      assert.ok(codes.includes('reserved_without_move'));
    });

    it('checks pending move, warning, and exemption references in both directions', function () {
      const errors = storageStateErrors({
        units: [
          unit('source', 'floor1', 'low', { availability_status: 'available' }),
          unit('destination', 'floor2', 'high', { availability_status: 'occupied', owner: 'other' }),
        ],
        requests: [{
          ...request('request', 'other', '2026-01-01', { floor: 'floor2' }, 'allocation'),
          request_status: 'waiting',
        }],
        assignments: [{ _id: 'ended', unit: 'source', owner: 'owner', ended_at: d('2026-01-02') }],
        moves: [{
          _id: 'move', owner: 'owner', request: 'request', from_assignment: 'ended',
          from_unit: 'source', to_unit: 'destination', move_status: 'pending',
        }],
        warnings: [
          { _id: 'warning-missing', assignment: 'missing', warning_status: 'open' },
          { _id: 'warning-ended', assignment: 'ended', warning_status: 'open' },
        ],
        exemptions: [
          { _id: 'exemption-missing', assignment: 'missing', active: true },
          { _id: 'exemption-expired', assignment: 'ended', active: true, exempt_until: NOW },
        ],
        now: NOW,
      });
      const codes = errors.map((error) => error.code);
      for (const code of [
        'move_source_assignment_ended',
        'move_source_unit_not_occupied',
        'move_destination_not_reserved',
        'move_request_type_mismatch',
        'move_request_not_in_progress',
        'move_request_owner_mismatch',
        'warning_assignment_missing',
        'open_warning_assignment_ended',
        'exemption_assignment_missing',
        'expired_exemption_still_active',
        'active_exemption_assignment_ended',
      ]) assert.ok(codes.includes(code), code);
    });

    it('allows a durable render failure but rejects deliverable channels without snapshots', function () {
      const failedRender = {
        render_status: 'missing_template',
        render_error: 'No storage warning template is configured',
        email: { status: 'unavailable' },
        sms: { status: 'unavailable' },
      };
      assert.deepStrictEqual(storageDeliveryStateErrors(failedRender), []);
      const pending = {
        render_status: 'render_failed',
        render_error: 'Template expression failed',
        email: { status: 'pending' },
        sms: { status: 'unavailable' },
      };
      const errors = storageDeliveryStateErrors(pending);
      assert.ok(errors.includes('email_render_required'));
      assert.ok(errors.includes('email_sender_required'));
      assert.ok(errors.includes('email_subject_required'));
      assert.ok(errors.includes('email_content_required'));
    });
  });
});
