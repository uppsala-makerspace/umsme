export const STORAGE_WARNING_DAYS = 28;
export const STORAGE_REMINDER_DAYS = 21;
export const STORAGE_MOVE_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;
const ACTIVE_REQUEST_STATUSES = new Set(['waiting', 'paused_ineligible', 'in_progress']);

const byId = (members, id) => {
  if (!members || !id) return undefined;
  if (members instanceof Map) return members.get(id);
  if (Array.isArray(members)) return members.find((member) => member._id === id);
  return members[id];
};

/** Resolve a member to the one paying member who owns family storage. */
export const resolveStorageOwner = (member, members) => {
  if (!member?._id) return { owner: null, error: 'member_missing' };
  const seen = new Set();
  let current = member;
  while (current?.infamily) {
    if (seen.has(current._id) || current.infamily === current._id) {
      return { owner: null, error: 'family_cycle' };
    }
    seen.add(current._id);
    const payer = byId(members, current.infamily);
    if (!payer) return { owner: null, error: 'family_payer_missing' };
    current = payer;
  }
  // Nested family links are invalid data. The loop detects cycles and still
  // resolves an acyclic chain, while reporting the chain for migration review.
  return {
    owner: current,
    error: seen.size > 1 ? 'nested_family' : null,
  };
};

export const hasActiveLabMembershipAt = (owner, now = new Date()) =>
  !!owner?.lab && new Date(owner.lab).getTime() > new Date(now).getTime();

export const legacyStoragePreference = (value) => {
  if (value === undefined || value === null || value === '') return { preference: undefined };
  if (value === 'none') return { release: true };
  const match = /^(floor1|floor2)(L|U)?$/.exec(value);
  if (!match) return { error: 'invalid_preference' };
  const preference = { floor: match[1] };
  if (match[2]) preference.height = match[2] === 'L' ? 'low' : 'high';
  return { preference };
};

export const preferenceSpecificity = (preference) =>
  Number(!!preference?.floor) + Number(!!preference?.height);

export const storagePreferenceMatches = (unit, preference) => {
  if (!preference) return true;
  if (preference.floor && unit?.floor !== preference.floor) return false;
  if (preference.height && unit?.height !== preference.height) return false;
  return true;
};

export const isActiveStorageRequest = (request) =>
  ACTIVE_REQUEST_STATUSES.has(request?.request_status);

export const desiredStorageRequestStatus = (requestType, labIsActive) =>
  requestType === 'release' || labIsActive ? 'waiting' : 'paused_ineligible';

/**
 * The exemption unique index follows `active`, while time-based expiry follows
 * `exempt_until`. Before previews and before creating/replacing an exemption,
 * Phase 3 must CAS rows with a non-null result to `{active: false, updatedAt}`.
 */
export const storageExemptionDeactivationReason = (exemption, now = new Date()) => {
  if (!exemption || exemption.active === false) return null;
  if (exemption.revoked_at) return 'revoked';
  if (exemption.exempt_until && new Date(exemption.exempt_until) <= new Date(now)) return 'expired';
  return null;
};

export const isStorageExemptionActive = (exemption, now = new Date()) => {
  if (!exemption || exemption.active === false) return false;
  return storageExemptionDeactivationReason(exemption, now) === null;
};

export const storageWarningDeadline = (warnedAt) =>
  new Date(new Date(warnedAt).getTime() + STORAGE_WARNING_DAYS * DAY_MS);

export const storageReminderAt = (warnedAt) =>
  new Date(new Date(warnedAt).getTime() + STORAGE_REMINDER_DAYS * DAY_MS);

export const storageMoveDeadline = (reservedAt) =>
  new Date(new Date(reservedAt).getTime() + STORAGE_MOVE_DAYS * DAY_MS);

export const isStorageReminderEligible = (
  warning,
  { now = new Date(), reminderAlreadySent = false, labIsActive = false, exemption } = {},
) => !!warning &&
  warning.warning_status === 'open' &&
  !reminderAlreadySent &&
  !labIsActive &&
  !isStorageExemptionActive(exemption, now) &&
  new Date(now) >= storageReminderAt(warning.warned_at) &&
  new Date(now) < new Date(warning.deadline_at);

export const isStorageReclamationEligible = (
  warning,
  { now = new Date(), labIsActive = false, exemption } = {},
) => !!warning &&
  warning.warning_status === 'open' &&
  !labIsActive &&
  !isStorageExemptionActive(exemption, now) &&
  new Date(now) >= new Date(warning.deadline_at);

export const isStorageMoveReviewDue = (move, now = new Date()) =>
  !!move && move.move_status === 'pending' && new Date(now) >= new Date(move.deadline_at);

export const storageUnitStateErrors = (unit) => {
  const errors = [];
  const owned = ['occupied', 'reserved', 'awaiting_clearance'].includes(unit?.availability_status);
  if (owned && !unit?.owner) errors.push('owner_required');
  if (!owned && unit?.owner) errors.push('owner_forbidden');
  return errors;
};

/** Referential and coordinate invariants for the physical storage layout. */
export const storageLayoutErrors = ({ walls = [], units = [] } = {}) => {
  const errors = [];
  const wallsById = new Map(walls.map((wall) => [wall._id, wall]));
  const occupiedCoordinates = new Set();
  for (const unit of units) {
    const wall = wallsById.get(unit.wall_id);
    if (!wall) {
      errors.push({ code: 'unit_wall_missing', id: unit._id });
      continue;
    }
    if (unit.floor !== wall.floor) errors.push({ code: 'unit_wall_floor_mismatch', id: unit._id });
    if (!Number.isInteger(unit.column) || !Number.isInteger(unit.row) ||
        unit.column < 1 || unit.row < 1 ||
        unit.column > wall.column_count || unit.row > wall.row_count) {
      errors.push({ code: 'unit_outside_wall_layout', id: unit._id });
      continue;
    }
    const coordinate = `${unit.wall_id}:${unit.column}:${unit.row}`;
    if (occupiedCoordinates.has(coordinate)) errors.push({ code: 'duplicate_unit_coordinate', id: unit._id });
    occupiedCoordinates.add(coordinate);
  }
  return errors;
};

const activeAssignment = (assignment) => !assignment.ended_at;

/** Return cross-document invariant violations without mutating state. */
export const storageStateErrors = ({
  units = [],
  requests = [],
  assignments = [],
  warnings = [],
  exemptions = [],
  moves = [],
  now = new Date(),
} = {}) => {
  const errors = [];
  const duplicate = (records, key, code) => {
    const seen = new Set();
    for (const record of records) {
      const value = record[key];
      if (!value) continue;
      if (seen.has(value)) errors.push({ code, id: record._id, value });
      seen.add(value);
    }
  };
  const activeAssignments = assignments.filter(activeAssignment);
  const activeRequests = requests.filter(isActiveStorageRequest);
  const openWarnings = warnings.filter((warning) => warning.warning_status === 'open');
  // This deliberately follows the materialized flag used by the unique index.
  // Reconciliation must clear expired/revoked rows with a CAS update before a
  // replacement exemption is inserted.
  const currentExemptions = exemptions.filter((exemption) => exemption.active === true);
  const pendingMoves = moves.filter((move) => move.move_status === 'pending');
  duplicate(activeAssignments, 'unit', 'duplicate_active_assignment_unit');
  duplicate(activeAssignments, 'owner', 'duplicate_active_assignment_owner');
  duplicate(activeRequests, 'owner', 'duplicate_active_request_owner');
  duplicate(openWarnings, 'assignment', 'duplicate_open_warning');
  duplicate(currentExemptions, 'assignment', 'duplicate_active_exemption');
  duplicate(pendingMoves, 'owner', 'duplicate_pending_move_owner');
  duplicate(pendingMoves, 'request', 'duplicate_pending_move_request');
  duplicate(pendingMoves, 'to_unit', 'duplicate_pending_move_destination');

  const unitsById = new Map(units.map((unit) => [unit._id, unit]));
  const requestsById = new Map(requests.map((request) => [request._id, request]));
  const assignmentsById = new Map(assignments.map((assignment) => [assignment._id, assignment]));
  const assignmentByUnit = new Map(activeAssignments.map((assignment) => [assignment.unit, assignment]));
  const moveByDestination = new Map(pendingMoves.map((move) => [move.to_unit, move]));

  for (const assignment of activeAssignments) {
    const unit = unitsById.get(assignment.unit);
    if (!unit) errors.push({ code: 'assignment_unit_missing', id: assignment._id });
    else {
      if (unit.availability_status !== 'occupied') {
        errors.push({ code: 'active_assignment_unit_not_occupied', id: assignment._id });
      }
      if (unit.owner !== assignment.owner) {
        errors.push({ code: 'assignment_owner_mismatch', id: assignment._id });
      }
    }
  }
  for (const unit of units) {
    for (const code of storageUnitStateErrors(unit)) errors.push({ code, id: unit._id });
    if (unit.availability_status === 'occupied') {
      const assignment = assignmentByUnit.get(unit._id);
      if (!assignment) errors.push({ code: 'occupied_without_assignment', id: unit._id });
      else if (assignment.owner !== unit.owner) errors.push({ code: 'assignment_owner_mismatch', id: unit._id });
    }
    if (unit.availability_status === 'reserved') {
      const move = moveByDestination.get(unit._id);
      if (!move) errors.push({ code: 'reserved_without_move', id: unit._id });
      else if (move.owner !== unit.owner) errors.push({ code: 'move_owner_mismatch', id: unit._id });
    }
  }

  for (const move of pendingMoves) {
    const assignment = assignmentsById.get(move.from_assignment);
    const source = unitsById.get(move.from_unit);
    const destination = unitsById.get(move.to_unit);
    const request = requestsById.get(move.request);
    if (!assignment) errors.push({ code: 'move_source_assignment_missing', id: move._id });
    else {
      if (!activeAssignment(assignment)) errors.push({ code: 'move_source_assignment_ended', id: move._id });
      if (assignment.unit !== move.from_unit) errors.push({ code: 'move_source_assignment_unit_mismatch', id: move._id });
      if (assignment.owner !== move.owner) errors.push({ code: 'move_source_assignment_owner_mismatch', id: move._id });
    }
    if (!source) errors.push({ code: 'move_source_unit_missing', id: move._id });
    else {
      if (source.availability_status !== 'occupied') errors.push({ code: 'move_source_unit_not_occupied', id: move._id });
      if (source.owner !== move.owner) errors.push({ code: 'move_source_unit_owner_mismatch', id: move._id });
    }
    if (!destination) errors.push({ code: 'move_destination_unit_missing', id: move._id });
    else {
      if (destination.availability_status !== 'reserved') errors.push({ code: 'move_destination_not_reserved', id: move._id });
      if (destination.owner !== move.owner) errors.push({ code: 'move_destination_owner_mismatch', id: move._id });
    }
    if (!request) errors.push({ code: 'move_request_missing', id: move._id });
    else {
      if (request.request_type !== 'move') errors.push({ code: 'move_request_type_mismatch', id: move._id });
      if (request.request_status !== 'in_progress') errors.push({ code: 'move_request_not_in_progress', id: move._id });
      if (request.owner !== move.owner) errors.push({ code: 'move_request_owner_mismatch', id: move._id });
      if (request.source_assignment !== move.from_assignment) errors.push({ code: 'move_request_assignment_mismatch', id: move._id });
    }
  }

  for (const warning of warnings) {
    const assignment = assignmentsById.get(warning.assignment);
    if (!assignment) errors.push({ code: 'warning_assignment_missing', id: warning._id });
    else {
      if (warning.owner !== assignment.owner) errors.push({ code: 'warning_owner_mismatch', id: warning._id });
      if (warning.warning_status === 'open' && !activeAssignment(assignment)) {
        errors.push({ code: 'open_warning_assignment_ended', id: warning._id });
      }
    }
  }
  for (const exemption of exemptions) {
    const assignment = assignmentsById.get(exemption.assignment);
    if (!assignment) errors.push({ code: 'exemption_assignment_missing', id: exemption._id });
    if (exemption.active === true) {
      if (exemption.revoked_at) errors.push({ code: 'revoked_exemption_still_active', id: exemption._id });
      if (exemption.exempt_until && new Date(exemption.exempt_until) <= new Date(now)) {
        errors.push({ code: 'expired_exemption_still_active', id: exemption._id });
      }
      if (assignment && !activeAssignment(assignment)) {
        errors.push({ code: 'active_exemption_assignment_ended', id: exemption._id });
      }
    }
  }
  return errors;
};

const compareText = (a = '', b = '') => (a < b ? -1 : a > b ? 1 : 0);
const requestOrder = (a, b) => {
  const time = new Date(a.requested_at) - new Date(b.requested_at);
  if (time) return time;
  const specificity = preferenceSpecificity(b.preference) - preferenceSpecificity(a.preference);
  return specificity || compareText(a._id, b._id);
};

/**
 * Pure, deterministic allocator. It proposes changes only; callers must
 * revalidate and persist every proposal server-side.
 */
export const proposeStorageAllocations = ({
  units = [],
  requests = [],
  assignments = [],
  members = {},
  now = new Date(),
} = {}) => {
  const available = units
    .filter((unit) =>
      unit.availability_status === 'available' && unit.floor && unit.height && !unit.owner)
    .sort((a, b) => compareText(a.name, b.name));
  const unitsById = new Map(units.map((unit) => [unit._id, unit]));
  const assignmentByOwner = new Map(
    assignments.filter(activeAssignment).map((assignment) => [assignment.owner, assignment]),
  );
  const waiting = requests
    .filter((request) => request.request_status === 'waiting')
    .filter((request) => request.request_type !== 'release')
    .filter((request) => hasActiveLabMembershipAt(byId(members, request.owner), now))
    .sort(requestOrder);

  const initial = waiting.filter((request) =>
    request.request_type === 'allocation' && !assignmentByOwner.has(request.owner));
  const moves = waiting.filter((request) => {
    if (request.request_type !== 'move') return false;
    const assignment = assignmentByOwner.get(request.owner);
    if (!assignment || !request.preference) return false;
    return !storagePreferenceMatches(unitsById.get(assignment.unit), request.preference);
  });

  const remainingUnits = new Map(available.map((unit) => [unit._id, unit]));
  const proposals = [];
  const usedRequests = new Set();

  const compatibleDemand = (unit, futureRequests) => futureRequests.filter((request) =>
    storagePreferenceMatches(unit, request.preference)).length;
  const chooseUnit = (candidates, primaryRequests = [], secondaryRequests = []) => [...candidates].sort((a, b) => {
    const primary = compatibleDemand(a, primaryRequests) - compatibleDemand(b, primaryRequests);
    const secondary = compatibleDemand(a, secondaryRequests) - compatibleDemand(b, secondaryRequests);
    return primary || secondary || compareText(a.name, b.name);
  })[0];

  // Phase 1: oldest unassigned request with a compatible unit.
  for (let index = 0; index < initial.length; index += 1) {
    const request = initial[index];
    const candidates = [...remainingUnits.values()].filter((unit) =>
      storagePreferenceMatches(unit, request.preference));
    if (!candidates.length) continue;
    const unit = chooseUnit(candidates, initial.slice(index + 1), moves);
    remainingUnits.delete(unit._id);
    usedRequests.add(request._id);
    proposals.push({ request, unit, phase: 1, reason: 'oldest_compatible_without_storage' });
  }

  // Phase 2: preferences are soft, so unmatched unassigned requests get the
  // least-contended remaining unit.
  const unmatchedInitial = initial.filter((request) => !usedRequests.has(request._id));
  for (let index = 0; index < unmatchedInitial.length && remainingUnits.size; index += 1) {
    const request = unmatchedInitial[index];
    const unit = chooseUnit(
      [...remainingUnits.values()],
      unmatchedInitial.slice(index + 1),
      moves,
    );
    remainingUnits.delete(unit._id);
    usedRequests.add(request._id);
    proposals.push({ request, unit, phase: 2, reason: 'oldest_without_storage_soft_fallback' });
  }

  // Phase 3: a move is worthwhile only when its destination satisfies a
  // preference that the current unit does not satisfy.
  for (let index = 0; index < moves.length; index += 1) {
    const request = moves[index];
    const candidates = [...remainingUnits.values()].filter((unit) =>
      storagePreferenceMatches(unit, request.preference));
    if (!candidates.length) continue;
    const unit = chooseUnit(candidates, moves.slice(index + 1));
    remainingUnits.delete(unit._id);
    usedRequests.add(request._id);
    proposals.push({ request, unit, phase: 3, reason: 'oldest_compatible_move' });
  }

  const skipped = waiting
    .filter((request) => !usedRequests.has(request._id))
    .map((request) => ({
      request,
      reason: request.request_type === 'move'
        ? 'no_beneficial_compatible_unit'
        : 'no_available_unit',
    }));
  return { proposals, skipped };
};
