import {
  desiredStorageRequestStatus,
  legacyStoragePreference,
  resolveStorageOwner,
  storageLayoutErrors,
  storageStateErrors,
} from '/imports/common/lib/storageRules';
import {
  LEGACY_STORAGE_MIGRATION_VERSION,
  normalizeLegacyStorageMigrationSource,
  stableStorageMigrationString,
  storageMigrationFingerprint,
} from '/imports/common/lib/legacyStorageMigrationFingerprint';

export {
  LEGACY_STORAGE_MIGRATION_VERSION,
  normalizeLegacyStorageMigrationSource,
  stableStorageMigrationString,
  storageMigrationFingerprint,
};
const SYSTEM_ACTOR = '__storage_migration__';
export const STORAGE_MIGRATION_MANIFEST_VERSION = 1;

const compareId = (a, b) => String(a?._id || '').localeCompare(String(b?._id || ''));
const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const issueOrder = (a, b) =>
  a.severity.localeCompare(b.severity) || a.code.localeCompare(b.code) ||
  String(a.entity_id || '').localeCompare(String(b.entity_id || ''));

const integerStorageNumber = (value) => {
  if (Number.isInteger(value)) return { value };
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    return { value: Number(value), normalized: true };
  }
  return { error: 'invalid_storage_number' };
};

const latestComment = (comments) => [...comments].sort((a, b) => {
  const aDate = new Date(a.modified || a.created || 0).getTime();
  const bDate = new Date(b.modified || b.created || 0).getTime();
  return bDate - aDate || compareId(b, a);
})[0];

const event = ({ id, entityType, entityId, eventType, cutoff, member, unit, details }) => ({
  _id: `${LEGACY_STORAGE_MIGRATION_VERSION}:event:${id}`,
  entity_type: entityType,
  entity_id: entityId,
  event_type: eventType,
  actor_type: 'system',
  actor: SYSTEM_ACTOR,
  ...(member ? { member } : {}),
  ...(unit ? { unit } : {}),
  occurred_at: new Date(cutoff),
  details,
});

/** Manifest only records migration-owned IDs; later v2 records are allowed. */
export const buildLegacyStorageMigrationManifest = (documents) => {
  const manifestDocuments = Object.fromEntries(
    ['storageWalls', 'storageUnits', 'storageRequests', 'storageOffers', 'storageEvents'].map((name) => [
      name,
      [...(documents[name] || [])].map((document) => document._id).sort(),
    ]),
  );
  const payload = { version: STORAGE_MIGRATION_MANIFEST_VERSION, documents: manifestDocuments };
  return { ...payload, digest: storageMigrationFingerprint(payload) };
};

/** Build a deterministic, side-effect-free migration plan. */
export const buildLegacyStorageMigrationPlan = ({
  walls = [], members = [], memberships = [], comments = [], cutoff,
} = {}) => {
  if (!cutoff || Number.isNaN(new Date(cutoff).getTime())) throw new Error('A valid migration cutoff is required');
  const at = new Date(cutoff);
  const source = normalizeLegacyStorageMigrationSource({ walls, members, memberships, comments, cutoff: at });
  const fingerprint = storageMigrationFingerprint(source);
  const issues = [];
  const addIssue = (severity, code, entityType, entityId, details) => issues.push({
    severity, code, entity_type: entityType, entity_id: entityId, ...(details ? { details } : {}),
  });
  const membersById = Object.fromEntries(members.map((member) => [member._id, member]));

  const definitions = new Map();
  const wallPositions = new Set();
  const storageWalls = [];
  const wallNames = new Set();
  if (!walls.length) addIssue('blocker', 'missing_storage_walls', 'migration', LEGACY_STORAGE_MIGRATION_VERSION);
  const orderedWalls = [...walls].sort((a, b) =>
    stableStorageMigrationString(a).localeCompare(stableStorageMigrationString(b)));
  for (const [wallIndex, wall] of orderedWalls.entries()) {
    const wallId = String(wall.name || 'unnamed');
    const shelfSize = wall.shelfSize === undefined ? 12 : wall.shelfSize;
    if (!wall.name || !['floor1', 'floor2'].includes(wall.floor) ||
        !Number.isInteger(wall.start) || !Number.isInteger(wall.end) || wall.end < wall.start ||
        !Number.isInteger(shelfSize) || shelfSize < 2 || shelfSize % 2 !== 0) {
      addIssue('blocker', 'invalid_wall_definition', 'wall', wallId);
      continue;
    }
    if (wallNames.has(wall.name)) {
      addIssue('blocker', 'duplicate_wall_name', 'wall', wallId);
      continue;
    }
    wallNames.add(wall.name);
    const storageWallId = `${LEGACY_STORAGE_MIGRATION_VERSION}:wall:${storageMigrationFingerprint(wall.name).slice(0, 24)}`;
    const rowCount = shelfSize / 2;
    const unitCount = wall.end - wall.start + 1;
    storageWalls.push({
      _id: storageWallId,
      name: wall.name,
      floor: wall.floor,
      display_order: wallIndex + 1,
      column_count: Math.ceil(unitCount / shelfSize) * 2,
      row_count: rowCount,
      active: true,
      createdAt: at,
      updatedAt: at,
    });
    for (let number = wall.start; number <= wall.end; number += 1) {
      const position = number - wall.start + 1;
      const layoutKey = `${wall.name}:${position}`;
      if (definitions.has(number)) {
        addIssue('blocker', 'overlapping_wall_range', 'unit', String(number));
        continue;
      }
      if (wallPositions.has(layoutKey)) {
        addIssue('blocker', 'duplicate_wall_position', 'unit', String(number));
        continue;
      }
      wallPositions.add(layoutKey);
      const shelfOffset = (position - 1) % shelfSize;
      definitions.set(number, {
        _id: `${LEGACY_STORAGE_MIGRATION_VERSION}:unit:${number}`,
        name: String(number),
        floor: wall.floor,
        wall_id: storageWallId,
        column: Math.floor((position - 1) / shelfSize) * 2 + (shelfOffset % 2) + 1,
        row: Math.floor(shelfOffset / 2) + 1,
      });
    }
  }

  const commentsByNumber = new Map();
  for (const comment of comments) {
    if (!String(comment.about || '').startsWith('_box')) continue;
    const match = /^_box_(\d+)$/.exec(comment.about);
    if (!match) {
      addIssue('warning', 'malformed_box_comment_reference', 'comment', comment._id);
      continue;
    }
    const number = Number(match[1]);
    if (!definitions.has(number)) {
      addIssue('warning', 'box_comment_outside_inventory', 'comment', comment._id, { number });
      continue;
    }
    const entries = commentsByNumber.get(number) || [];
    entries.push(comment);
    commentsByNumber.set(number, entries);
  }
  for (const [number, entries] of commentsByNumber) {
    if (entries.length > 1) {
      addIssue('warning', 'duplicate_box_comments', 'unit', String(number), {
        comment_ids: entries.map((entry) => entry._id).sort(),
      });
    }
  }

  const claimsByUnit = new Map();
  const claimedUnitsByOwner = new Map();
  const ownerResolution = new Map();
  for (const member of members) {
    const resolved = resolveStorageOwner(member, membersById);
    ownerResolution.set(member._id, resolved);
    const hasStorage = hasOwn(member, 'storage') && member.storage !== null && member.storage !== undefined;
    const hasRequest = member.storagequeue === true ||
      (hasOwn(member, 'storagerequest') && member.storagerequest !== null &&
       member.storagerequest !== undefined && member.storagerequest !== '');
    if (resolved.error && (hasStorage || hasRequest)) {
      addIssue('blocker', resolved.error, 'member', member._id);
    }
    if (!hasStorage) continue;
    const normalized = integerStorageNumber(member.storage);
    if (normalized.error) {
      addIssue('blocker', normalized.error, 'member', member._id, { value: member.storage });
      continue;
    }
    if (normalized.normalized) {
      addIssue('warning', 'numeric_string_storage_normalized', 'member', member._id, { value: member.storage });
    }
    const number = normalized.value;
    if (!definitions.has(number)) {
      addIssue('blocker', 'storage_outside_inventory', 'member', member._id, { number });
      continue;
    }
    if (!resolved.owner || resolved.error) continue;
    const claim = { member_id: member._id, owner: resolved.owner._id, number };
    const unitClaims = claimsByUnit.get(number) || [];
    unitClaims.push(claim);
    claimsByUnit.set(number, unitClaims);
    const ownerUnits = claimedUnitsByOwner.get(claim.owner) || new Set();
    ownerUnits.add(number);
    claimedUnitsByOwner.set(claim.owner, ownerUnits);
  }
  for (const [number, claims] of claimsByUnit) {
    const owners = [...new Set(claims.map((claim) => claim.owner))];
    if (owners.length > 1) addIssue('blocker', 'unit_claimed_by_multiple_owners', 'unit', String(number), { owners });
    else if (claims.length > 1) {
      addIssue('warning', 'duplicate_family_claim_collapsed', 'unit', String(number), {
        owner: owners[0], member_ids: claims.map((claim) => claim.member_id).sort(),
      });
    }
  }
  for (const [owner, numbers] of claimedUnitsByOwner) {
    if (numbers.size > 1) {
      addIssue('blocker', 'family_claims_multiple_units', 'member', owner, { units: [...numbers].sort((a, b) => a - b) });
    }
  }

  const unitByOwner = new Map();
  const events = [];
  for (const [number, claims] of [...claimsByUnit].sort((a, b) => a[0] - b[0])) {
    const owners = [...new Set(claims.map((claim) => claim.owner))];
    if (owners.length !== 1 || claimedUnitsByOwner.get(owners[0])?.size !== 1) continue;
    const owner = owners[0];
    const occupancy = {
      unit: definitions.get(number)._id,
      owner,
      assigned_at: at,
      assigned_by: SYSTEM_ACTOR,
    };
    unitByOwner.set(owner, occupancy);
    events.push(event({
      id: `assignment:${owner}`,
      entityType: 'storageUnit',
      entityId: occupancy.unit,
      eventType: 'legacy_assignment_migrated',
      member: owner,
      unit: occupancy.unit,
      cutoff: at,
      details: {
        source_member_ids: claims.map((claim) => claim.member_id).sort(),
        legacy_storage_number: number,
        assigned_at_source: 'migration_cutoff',
        original_assigned_at_known: false,
      },
    }));
  }

  const units = [...definitions.entries()].sort((a, b) => a[0] - b[0]).map(([number, base]) => {
    const claims = claimsByUnit.get(number) || [];
    const owners = [...new Set(claims.map((claim) => claim.owner))];
    const validOwner = owners.length === 1 && claimedUnitsByOwner.get(owners[0])?.size === 1
      ? owners[0] : undefined;
    const selectedComment = latestComment(commentsByNumber.get(number) || []);
    const note = typeof selectedComment?.text === 'string' ? selectedComment.text.trim() : '';
    return {
      ...base,
      ...(validOwner ? {
        owner: validOwner,
        assigned_at: at,
        assigned_by: SYSTEM_ACTOR,
      } : {}),
      availability_status: validOwner ? 'occupied' : note ? 'unavailable' : 'available',
      ...(note ? { note } : {}),
      createdAt: at,
      updatedAt: at,
    };
  });

  const membershipByOwner = new Map();
  for (const membership of memberships) {
    const entries = membershipByOwner.get(membership.mid) || [];
    entries.push(membership);
    membershipByOwner.set(membership.mid, entries);
  }
  const requestSignalsByOwner = new Map();
  for (const member of members) {
    const requestPresent = hasOwn(member, 'storagerequest') &&
      member.storagerequest !== undefined && member.storagerequest !== null && member.storagerequest !== '';
    if (member.storagequeue !== true && !requestPresent) continue;
    const resolved = ownerResolution.get(member._id);
    if (!resolved?.owner || resolved.error) continue;
    const signals = requestSignalsByOwner.get(resolved.owner._id) || [];
    signals.push({ member_id: member._id, requestPresent, value: member.storagerequest });
    requestSignalsByOwner.set(resolved.owner._id, signals);
  }

  const requests = [];
  for (const [owner, signals] of [...requestSignalsByOwner].sort((a, b) => a[0].localeCompare(b[0]))) {
    const parsed = signals.map((signal) => ({ signal, parsed: legacyStoragePreference(signal.value) }));
    for (const item of parsed) {
      if (item.parsed.error) addIssue('blocker', item.parsed.error, 'member', item.signal.member_id, { value: item.signal.value });
    }
    if (parsed.some((item) => item.parsed.error)) continue;
    const meanings = [...new Set(parsed.map((item) => stableStorageMigrationString(item.parsed)))];
    if (meanings.length > 1) {
      addIssue('blocker', 'conflicting_family_request_signals', 'member', owner, {
        member_ids: signals.map((signal) => signal.member_id).sort(),
      });
      continue;
    }
    if (signals.length > 1) {
      addIssue('warning', 'duplicate_family_request_collapsed', 'member', owner, {
        member_ids: signals.map((signal) => signal.member_id).sort(),
      });
    }
    const meaning = parsed[0].parsed;
    const currentUnit = unitByOwner.get(owner);
    let requestType;
    if (!currentUnit) {
      if (meaning.release) {
        addIssue('blocker', 'release_without_assignment', 'member', owner);
        continue;
      }
      requestType = 'allocation';
    } else if (meaning.release) {
      requestType = 'release';
    } else if (meaning.preference) {
      requestType = 'move';
    } else {
      addIssue('blocker', 'assigned_queue_without_preference', 'member', owner);
      continue;
    }
    const ownerMemberships = membershipByOwner.get(owner) || [];
    const starts = ownerMemberships.map((membership) => membership.start).filter(Boolean)
      .map((start) => new Date(start)).filter((start) => !Number.isNaN(start.getTime()));
    if (!starts.length) {
      addIssue('blocker', 'request_owner_missing_membership_start', 'member', owner);
      continue;
    }
    const requestedAt = new Date(Math.min(...starts.map((start) => start.getTime())));
    const labEnds = ownerMemberships
      .filter((membership) => ['lab', 'labandmember'].includes(membership.type) && membership.labend)
      .map((membership) => new Date(membership.labend))
      .filter((end) => !Number.isNaN(end.getTime()));
    const activeLab = labEnds.some((end) => end > at);
    const payer = membersById[owner];
    const projectedLabActive = !!payer?.lab && new Date(payer.lab) > at;
    if (activeLab !== projectedLabActive) {
      addIssue('warning', 'lab_projection_mismatch', 'member', owner, {
        memberships_active: activeLab, member_projection_active: projectedLabActive,
      });
    }
    const request = {
      _id: `${LEGACY_STORAGE_MIGRATION_VERSION}:request:${owner}`,
      owner,
      request_type: requestType,
      requested_at: requestedAt,
      ...(meaning.preference ? { preference: meaning.preference } : {}),
      ...(currentUnit ? { source_unit: currentUnit.unit } : {}),
      request_status: desiredStorageRequestStatus(requestType, activeLab),
      createdAt: at,
      updatedAt: at,
    };
    requests.push(request);
    events.push(event({
      id: `request:${owner}`,
      entityType: 'storageRequest',
      entityId: request._id,
      eventType: 'legacy_request_migrated',
      member: owner,
      unit: currentUnit?.unit,
      cutoff: at,
      details: {
        source_member_ids: signals.map((signal) => signal.member_id).sort(),
        requested_at_source: 'earliest_payer_membership_start',
        requested_at_is_approximate: true,
      },
    }));
  }

  for (const invariant of storageStateErrors({ units, requests, offers: [], now: at })) {
    addIssue('blocker', `planned_${invariant.code}`, 'migrationPlan', invariant.id, invariant);
  }
  for (const invariant of storageLayoutErrors({ walls: storageWalls, units })) {
    addIssue('blocker', `planned_${invariant.code}`, 'migrationPlan', invariant.id, invariant);
  }
  issues.sort(issueOrder);
  const blockers = issues.filter((entry) => entry.severity === 'blocker');
  const warnings = issues.filter((entry) => entry.severity === 'warning');
  const documents = {
    storageWalls,
    storageUnits: units,
    storageRequests: requests,
    storageOffers: [],
    storageEvents: events,
  };
  const counts = {
    source: { walls: walls.length, members: members.length, memberships: memberships.length, comments: comments.length },
    planned: Object.fromEntries(Object.entries(documents).map(([name, records]) => [name, records.length])),
    occupied_units: units.filter((unit) => unit.availability_status === 'occupied').length,
    unavailable_units: units.filter((unit) => unit.availability_status === 'unavailable').length,
    unclassified_units: units.filter((unit) => !unit.height).length,
    request_types: {
      allocation: requests.filter((request) => request.request_type === 'allocation').length,
      move: requests.filter((request) => request.request_type === 'move').length,
      release: requests.filter((request) => request.request_type === 'release').length,
    },
  };
  counts.planned.storageEvents += 1; // include the summary event appended below
  // The summary is deliberately excluded from its own manifest. Its presence
  // is the commit marker; the manifest proves all preceding inserts survived.
  const manifest = buildLegacyStorageMigrationManifest(documents);
  const summary = event({
    id: 'summary', entityType: 'storageMigration', entityId: LEGACY_STORAGE_MIGRATION_VERSION,
    eventType: 'legacy_storage_migration_applied', cutoff: at,
    details: {
      fingerprint,
      counts,
      blocker_count: blockers.length,
      warning_count: warnings.length,
      manifest,
    },
  });
  documents.storageEvents.push(summary);
  return {
    version: LEGACY_STORAGE_MIGRATION_VERSION,
    cutoff: at,
    fingerprint,
    report: {
      counts,
      issues,
      blocker_count: blockers.length,
      warning_count: warnings.length,
      allocation_ready: false,
      allocation_blocked_reasons: [
        ...(blockers.length ? ['migration_blockers'] : []),
        ...(counts.unclassified_units ? ['unclassified_units'] : []),
        'migration_not_applied',
      ],
    },
    documents,
  };
};

/** Pure insert/already/conflict classifier used by the resumable adapter. */
export const diffLegacyMigrationDocuments = (documents, existing = {}) => {
  const result = { inserts: {}, already_present: {}, conflicts: [] };
  for (const [collection, desired] of Object.entries(documents)) {
    const current = new Map((existing[collection] || []).map((record) => [record._id, record]));
    result.inserts[collection] = [];
    result.already_present[collection] = [];
    for (const document of desired) {
      const found = current.get(document._id);
      if (!found) result.inserts[collection].push(document);
      else if (stableStorageMigrationString(found) === stableStorageMigrationString(document)) {
        result.already_present[collection].push(document._id);
      } else result.conflicts.push({ collection, id: document._id, code: 'existing_document_differs' });
    }
  }
  return result;
};
