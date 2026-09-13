export const STORAGE_ACTIONS = [
  { id: 'allocate', label: 'Make assignments', help: 'Assign suggested units.' },
  { id: 'warn', label: 'Send warnings', help: 'Warn overdue occupants.' },
  { id: 'remind', label: 'Send reminders', help: 'Remind warned occupants.' },
  { id: 'reclaim', label: 'Reclaim assignments', help: 'Reclaim after 28 days.' },
  { id: 'release', label: 'Process releases', help: 'Handle release requests.' },
  { id: 'review_expired_moves', label: 'Review expired moves', help: 'Resolve expired moves.' },
  { id: 'confirm_clearance', label: 'Confirm clearances', help: 'Release cleared units.' },
];

export const storageStatusLabel = (status) => ({
  available: 'Available', occupied: 'Occupied', reserved: 'Reserved',
  awaiting_clearance: 'Awaiting clearance', unavailable: 'Unavailable',
}[status] || status || 'Unknown');

export const storageStatusClass = (status) => `storage-status-${status || 'unknown'}`;

const actionReasonLabels = {
  oldest_compatible_without_storage: 'Oldest compatible request without storage',
  oldest_without_storage_soft_fallback: 'Oldest request without storage; preference unavailable',
  oldest_compatible_move: 'Oldest compatible move request',
  lab_membership_inactive_unwarned: 'Lab membership expired; no warning sent',
  warning_age_21_days: 'Warning is at least 21 days old',
  warning_deadline_passed: 'The 28-day warning deadline passed',
  voluntary_release_requested: 'Member requested release',
  move_deadline_passed: 'The 14-day move deadline passed',
  awaiting_physical_clearance: 'Unit is awaiting clearance',
};

export const storageActionReasonLabel = (reason) =>
  actionReasonLabels[reason] || String(reason || '—').replaceAll('_', ' ');

export const storageMemberLabel = (member = {}) => [
  member.name || 'Unnamed member',
  member.mid ? `(${member.mid})` : '',
  member.email ? `— ${member.email}` : '',
].filter(Boolean).join(' ');

const activeRequestStatuses = new Set(['waiting', 'paused_ineligible', 'in_progress']);

export const storagePreferenceLabel = (preference = {}) => {
  const floor = { floor1: 'Floor 1', floor2: 'Floor 2' }[preference.floor];
  const height = { low: 'Low', high: 'High' }[preference.height];
  return [floor, height].filter(Boolean).join(' · ') || 'Any available unit';
};

export const filterStorageQueue = (rows, query) => {
  const needle = String(query || '').trim().toLowerCase();
  if (!needle) return rows;
  return rows.filter((row) => [row.memberName, row.memberNumber, row.memberEmail]
    .some((value) => String(value || '').toLowerCase().includes(needle)));
};

export const storageQueueRows = ({ requests = [], members = [], assignments = [], units = [], now = new Date() }) => {
  const memberById = new Map(members.map((member) => [member._id, member]));
  const unitById = new Map(units.map((unit) => [unit._id, unit]));
  const assignmentByOwner = new Map(assignments
    .filter((assignment) => !assignment.ended_at)
    .map((assignment) => [assignment.owner, assignment]));
  return requests
    .filter((request) => activeRequestStatuses.has(request.request_status) && request.request_type !== 'release')
    .sort((left, right) => new Date(left.requested_at) - new Date(right.requested_at)
      || String(left._id).localeCompare(String(right._id)))
    .map((request) => {
      const member = memberById.get(request.owner);
      const assignment = assignmentByOwner.get(request.owner);
      const unit = assignment && unitById.get(assignment.unit);
      const editable = ['waiting', 'paused_ineligible'].includes(request.request_status);
      const eligible = !!member?.lab && new Date(member.lab).getTime() > new Date(now).getTime();
      return {
        ...request,
        memberName: member?.name || 'Unknown member',
        memberNumber: member?.mid || '',
        memberEmail: member?.email || '',
        currentUnit: unit?.name || '—',
        preferenceLabel: storagePreferenceLabel(request.preference),
        requestLabel: request.request_type === 'move' ? 'Different unit' : 'Storage unit',
        eligibilityLabel: eligible ? 'Eligible' : 'Not eligible',
        eligibilityClass: eligible ? 'storage-eligible' : 'storage-ineligible',
        pauseLabel: request.request_status === 'paused_ineligible'
          ? 'Paused' : (request.request_status === 'in_progress' ? 'Assignment in progress' : 'Active'),
        pauseTarget: request.request_status === 'waiting',
        pauseActionLabel: request.request_status === 'paused_ineligible' ? 'Resume' : 'Pause',
        canTogglePause: request.request_status === 'waiting' ? !eligible
          : (request.request_status === 'paused_ineligible' && eligible),
        editable,
      };
    });
};

export const filterStorageUnits = (units, filters = {}) => units.filter((unit) => {
  if (filters.status && unit.availability_status !== filters.status) return false;
  if (filters.floor && unit.floor !== filters.floor) return false;
  if (filters.height === 'unclassified' && unit.height) return false;
  if (filters.height && filters.height !== 'unclassified' && unit.height !== filters.height) return false;
  if (filters.wall && unit.wall_id !== filters.wall) return false;
  if (filters.owner && !unit.owner) return false;
  if (filters.overdue && !unit._overdue) return false;
  if (filters.warning && unit._warningState !== filters.warning) return false;
  const query = String(filters.query || '').trim().toLowerCase();
  return !query || [unit.name, unit.wall_name, unit.note].some((value) =>
    String(value || '').toLowerCase().includes(query));
});

export const groupStorageWalls = (units, walls = []) => {
  const unitsByWall = new Map();
  for (const unit of units) {
    const rows = unitsByWall.get(unit.wall_id) || [];
    rows.push(unit);
    unitsByWall.set(unit.wall_id, rows);
  }
  return [...walls]
    .sort((a, b) => a.display_order - b.display_order || a.name.localeCompare(b.name))
    .filter((wall) => unitsByWall.has(wall._id))
    .map((wall) => {
      const unitsForWall = unitsByWall.get(wall._id).sort((a, b) =>
        a.column - b.column || a.row - b.row || a.name.localeCompare(b.name));
      const byCoordinate = new Map(unitsForWall.map((unit) => [`${unit.column}:${unit.row}`, unit]));
      const columns = Array.from({ length: wall.column_count }, (_, columnIndex) => ({
        number: columnIndex + 1,
        units: Array.from({ length: wall.row_count }, (_, rowIndex) => {
          const column = columnIndex + 1;
          const row = rowIndex + 1;
          return byCoordinate.get(`${column}:${row}`) || {
            empty: true,
            key: `${wall._id}:${column}:${row}`,
            column,
            row,
          };
        }),
      }));
      return { ...wall, units: unitsForWall, columns };
    });
};

const readinessReasonLabels = {
  migration_not_applied: 'The storage migration has not been applied.',
  migration_manifest_invalid: 'The storage migration manifest is invalid.',
  migration_manifest_incomplete: 'One or more migrated storage records are missing.',
  cutover_finalization_invalid: 'The storage migration cutover record is invalid.',
  legacy_source_changed_after_migration: 'Legacy storage data changed after migration.',
  unclassified_units: 'One or more available units need an upper or lower classification.',
  storage_invariant_errors: 'Stored assignments or unit states are inconsistent.',
  storage_layout_errors: 'Storage wall references or coordinates are inconsistent.',
};

export const storageReadinessReasonLabel = (reason) =>
  readinessReasonLabels[reason] || String(reason || 'Unknown readiness problem').replaceAll('_', ' ');

export const storageReadinessPresentation = (readiness) => {
  if (!readiness) return { state: 'loading', label: 'Checking migration readiness…', detail: '', reasons: [] };
  const reasonCodes = Array.isArray(readiness.allocation_blocked_reasons)
    ? readiness.allocation_blocked_reasons
    : [];
  const reasons = reasonCodes.map(storageReadinessReasonLabel);
  if (readiness.allocation_ready === true) {
    return { state: 'ready', label: 'Ready.', detail: 'Migration and invariant checks passed.', reasons };
  }
  if (reasonCodes.length === 1 && reasonCodes[0] === 'unclassified_units') {
    return {
      state: 'metadata', label: 'Metadata incomplete.',
      detail: `${readiness.unclassified_unit_ids?.length || 0} unit(s) need a height.`, reasons,
    };
  }
  return {
    state: reasonCodes.includes('migration_not_applied') ? 'missing' : 'blocked',
    label: reasonCodes.includes('migration_not_applied') ? 'Migration missing.' : 'Allocation blocked.',
    detail: 'Automatic allocation remains disabled until every authoritative blocker is resolved.',
    reasons,
  };
};

export const bulkHeightImpact = (units, selectedIds) => {
  const selected = new Set(selectedIds);
  const affected = units.filter(({ _id }) => selected.has(_id));
  const protectedCount = affected.filter(({ availability_status }) =>
    ['occupied', 'reserved'].includes(availability_status)).length;
  return {
    selectedCount: affected.length,
    protectedCount,
    requiresAcknowledgement: protectedCount > 0,
  };
};

export const joinStorageResults = (results = [], confirmedRows = []) => {
  const rows = new Map(confirmedRows.map((row) => [row.suggestion_id, row]));
  return results.map((result) => {
    const row = rows.get(result.suggestion_id) || {};
    const member = row.member_name || row.owner || 'Unknown member';
    const unit = row.unit_name || row.unit || 'No unit';
    return {
      ...result,
      label: `${member} · ${unit}`,
      statusLabel: ({
        applied: 'Applied',
        already_applied: 'Already applied',
        stale: 'Needs review',
        conflict: 'Needs review',
        failed: 'Failed',
      })[result.status] || result.status,
    };
  });
};

export const storageResultSummary = (results = []) => {
  const counts = { applied: 0, review: 0, failed: 0 };
  for (const result of results) {
    if (['applied', 'already_applied', 'updated'].includes(result.status)) counts.applied += 1;
    else if (['stale', 'conflict'].includes(result.status)) counts.review += 1;
    else counts.failed += 1;
  }
  return [
    counts.applied ? `${counts.applied} applied` : null,
    counts.review ? `${counts.review} need review` : null,
    counts.failed ? `${counts.failed} failed` : null,
  ].filter(Boolean).join(' · ') || 'No results';
};

export const joinBulkHeightResults = (results = [], units = []) => {
  const unitNames = new Map(units.map((unit) => [unit._id, unit.name]));
  return results.map((result) => ({
    ...result,
    label: unitNames.get(result.unitId) || 'Unknown unit',
    statusClass: result.status === 'updated' ? 'applied' : 'failed',
    statusLabel: result.status === 'updated' ? 'Updated' : 'Failed',
  }));
};

export const sameSuggestionSet = (left = [], right = []) => {
  const ids = (rows) => rows.map(({ suggestion_id }) => suggestion_id).sort();
  return JSON.stringify(ids(left)) === JSON.stringify(ids(right));
};
