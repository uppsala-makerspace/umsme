export const STORAGE_WARNING_DAYS = 28;
export const STORAGE_REMINDER_DAYS = 21;
export const STORAGE_MOVE_DAYS = 14;
export const STORAGE_OPERATOR_ROLES = ['admin', 'board', 'storage'];

/** A client-side idempotency key for a storage command; a UUID where the runtime has one. */
export const newStorageCommandId = (prefix = '') => {
  const id = globalThis.crypto?.randomUUID?.()
    || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return prefix ? `${prefix}:${id}` : id;
};

const DAY_MS = 24 * 60 * 60 * 1000;
/** Statuses that keep a request in the queue; the partial unique index uses the same list. */
export const ACTIVE_STORAGE_REQUEST_STATUSES = ['waiting', 'paused_ineligible', 'in_progress'];
/** Statuses in which the member or an administrator may still change or cancel a request. */
export const EDITABLE_STORAGE_REQUEST_STATUSES = ['waiting', 'paused_ineligible'];
const ACTIVE_REQUEST_STATUSES = new Set(ACTIVE_STORAGE_REQUEST_STATUSES);

const byId = (members, id) => {
  if (!members || !id) return undefined;
  if (typeof members === 'function') return members(id);
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

/** Rows count from the top. On odd walls, the middle row belongs to the low half. */
export const storageHeightForRow = (row, rowCount) => {
  if (!Number.isInteger(row) || !Number.isInteger(rowCount) ||
      row < 1 || rowCount < 1 || row > rowCount) return undefined;
  return row <= Math.floor(rowCount / 2) ? 'high' : 'low';
};

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

export const isEditableStorageRequest = (request) =>
  EDITABLE_STORAGE_REQUEST_STATUSES.includes(request?.request_status);

export const desiredStorageRequestStatus = (requestType, labIsActive) =>
  requestType === 'release' || labIsActive ? 'waiting' : 'paused_ineligible';

/**
 * Why an exemption should be cleared, or null while it still applies. An
 * exemption is an embedded object on the unit with an optional `exempt_until`;
 * reconciliation $unsets the whole object once this returns a reason.
 */
export const storageExemptionDeactivationReason = (exemption, now = new Date()) => {
  if (!exemption) return null;
  if (exemption.exempt_until && new Date(exemption.exempt_until) <= new Date(now)) return 'expired';
  return null;
};

export const isStorageExemptionActive = (exemption, now = new Date()) => {
  if (!exemption) return false;
  return storageExemptionDeactivationReason(exemption, now) === null;
};

export const storageWarningDeadline = (warnedAt) =>
  new Date(new Date(warnedAt).getTime() + STORAGE_WARNING_DAYS * DAY_MS);

export const storageReminderAt = (warnedAt) =>
  new Date(new Date(warnedAt).getTime() + STORAGE_REMINDER_DAYS * DAY_MS);

export const storageOfferDeadline = (reservedAt) =>
  new Date(new Date(reservedAt).getTime() + STORAGE_MOVE_DAYS * DAY_MS);

export const isStorageReminderEligible = (
  warning,
  { now = new Date(), labIsActive = false, exemption } = {},
) => !!warning &&
  !warning.reminded_at &&
  !labIsActive &&
  !isStorageExemptionActive(exemption, now) &&
  new Date(now) >= storageReminderAt(warning.warned_at) &&
  new Date(now) < new Date(warning.deadline_at);

export const isStorageReclamationEligible = (
  warning,
  { now = new Date(), labIsActive = false, exemption } = {},
) => !!warning &&
  !labIsActive &&
  !isStorageExemptionActive(exemption, now) &&
  new Date(now) >= new Date(warning.deadline_at);

export const isStorageOfferReviewDue = (offer, now = new Date()) =>
  !!offer && new Date(now) >= new Date(offer.deadline_at);

export const storageUnitStateErrors = (unit) => {
  const errors = [];
  const owned = ['occupied', 'reserved', 'awaiting_clearance'].includes(unit?.availability_status);
  if (owned && !unit?.owner) errors.push('owner_required');
  if (!owned && unit?.owner) errors.push('owner_forbidden');
  if (unit?.availability_status === 'occupied' && (!unit.assigned_at || !unit.assigned_by)) {
    errors.push('assignment_metadata_required');
  }
  if (unit?.warning && unit?.availability_status !== 'occupied') errors.push('warning_without_occupancy');
  if (unit?.exemption && unit?.availability_status !== 'occupied') errors.push('exemption_without_occupancy');
  return errors;
};

/** Referential and coordinate invariants for the physical storage layout. */
export const isUnitOutsideWallLayout = (wall, column, row) =>
  !Number.isInteger(column) || !Number.isInteger(row) ||
  column < 1 || row < 1 || column > wall.column_count || row > wall.row_count;

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
    if (isUnitOutsideWallLayout(wall, unit.column, unit.row)) {
      errors.push({ code: 'unit_outside_wall_layout', id: unit._id });
      continue;
    }
    if (unit.height !== storageHeightForRow(unit.row, wall.row_count)) {
      errors.push({ code: 'unit_height_row_mismatch', id: unit._id });
    }
    const coordinate = `${unit.wall_id}:${unit.column}:${unit.row}`;
    if (occupiedCoordinates.has(coordinate)) errors.push({ code: 'duplicate_unit_coordinate', id: unit._id });
    occupiedCoordinates.add(coordinate);
  }
  return errors;
};

/** Return cross-document invariant violations without mutating state. */
export const storageStateErrors = ({
  units = [],
  requests = [],
  offers = [],
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
  const activeRequests = requests.filter(isActiveStorageRequest);
  const occupied = units.filter((unit) => unit.availability_status === 'occupied');
  const reserved = units.filter((unit) => unit.availability_status === 'reserved');
  duplicate(occupied, 'owner', 'duplicate_occupied_owner');
  duplicate(activeRequests, 'owner', 'duplicate_active_request_owner');
  duplicate(offers, 'owner', 'duplicate_pending_offer_owner');
  duplicate(offers, 'request', 'duplicate_pending_offer_request');
  duplicate(offers, 'to_unit', 'duplicate_pending_offer_destination');

  const unitsById = new Map(units.map((unit) => [unit._id, unit]));
  const requestsById = new Map(requests.map((request) => [request._id, request]));
  const offerByDestination = new Map(offers.map((offer) => [offer.to_unit, offer]));
  for (const unit of units) {
    for (const code of storageUnitStateErrors(unit)) errors.push({ code, id: unit._id });
    if (unit.availability_status === 'reserved') {
      const offer = offerByDestination.get(unit._id);
      if (!offer) errors.push({ code: 'reserved_without_offer', id: unit._id });
      else if (offer.owner !== unit.owner) errors.push({ code: 'offer_owner_mismatch', id: unit._id });
    }
  }

  for (const offer of offers) {
    const source = unitsById.get(offer.from_unit);
    const destination = unitsById.get(offer.to_unit);
    const request = requestsById.get(offer.request);
    if (!source) errors.push({ code: 'offer_source_unit_missing', id: offer._id });
    else {
      if (source.availability_status !== 'occupied') errors.push({ code: 'offer_source_unit_not_occupied', id: offer._id });
      if (source.owner !== offer.owner) errors.push({ code: 'offer_source_unit_owner_mismatch', id: offer._id });
    }
    if (!destination) errors.push({ code: 'offer_destination_unit_missing', id: offer._id });
    else {
      if (destination.availability_status !== 'reserved') errors.push({ code: 'offer_destination_not_reserved', id: offer._id });
      if (destination.owner !== offer.owner) errors.push({ code: 'offer_destination_owner_mismatch', id: offer._id });
    }
    if (!request) errors.push({ code: 'offer_request_missing', id: offer._id });
    else {
      if (request.request_type !== 'move') errors.push({ code: 'offer_request_type_mismatch', id: offer._id });
      if (request.request_status !== 'in_progress') errors.push({ code: 'offer_request_not_in_progress', id: offer._id });
      if (request.owner !== offer.owner) errors.push({ code: 'offer_request_owner_mismatch', id: offer._id });
      if (request.source_unit !== offer.from_unit) errors.push({ code: 'offer_request_source_mismatch', id: offer._id });
    }
  }
  for (const unit of occupied) {
    if (storageExemptionDeactivationReason(unit.exemption, now) === 'expired') {
      errors.push({ code: 'expired_exemption_not_cleared', id: unit._id });
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
  members = {},
  now = new Date(),
} = {}) => {
  const available = units
    .filter((unit) =>
      unit.availability_status === 'available' && unit.floor && unit.height && !unit.owner)
    .sort((a, b) => compareText(a.name, b.name));
  const unitByOwner = new Map(units.filter((unit) => unit.availability_status === 'occupied')
    .map((unit) => [unit.owner, unit]));
  const waiting = requests
    .filter((request) => request.request_status === 'waiting')
    .filter((request) => request.request_type !== 'release')
    .filter((request) => hasActiveLabMembershipAt(byId(members, request.owner), now))
    .sort(requestOrder);

  const initial = waiting.filter((request) =>
    request.request_type === 'allocation' && !unitByOwner.has(request.owner));
  const moves = waiting.filter((request) => {
    if (request.request_type !== 'move') return false;
    const currentUnit = unitByOwner.get(request.owner);
    if (!currentUnit || !request.preference) return false;
    return !storagePreferenceMatches(currentUnit, request.preference);
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
