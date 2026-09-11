const indexById = (rows) => new Map(rows.map((row) => [row._id, row]));

const createRelationsResolver = (records) => {
  const assignments = indexById(records.assignments);
  const requests = indexById(records.requests);
  const warnings = indexById(records.warnings);
  const exemptions = indexById(records.exemptions);
  const moves = indexById(records.moves);

  return (event) => {
    const owners = new Set();
    const units = new Set();
    const addOwner = (id) => { if (id) owners.add(id); };
    const addUnit = (id) => { if (id) units.add(id); };
    const addRequest = (id) => addOwner(requests.get(id)?.owner);
    const addAssignment = (id) => {
      const assignment = assignments.get(id);
      if (!assignment) return;
      addOwner(assignment.owner);
      addUnit(assignment.unit);
      addRequest(assignment.request);
    };
    const addWarning = (id) => {
      const warning = warnings.get(id);
      if (!warning) return;
      addOwner(warning.owner);
      addAssignment(warning.assignment);
    };
    const addExemption = (id) => addAssignment(exemptions.get(id)?.assignment);
    const addMove = (id) => {
      const move = moves.get(id);
      if (!move) return;
      addOwner(move.owner);
      addUnit(move.from_unit);
      addUnit(move.to_unit);
      addAssignment(move.from_assignment);
      addRequest(move.request);
    };

    ({
      storageUnit: addUnit,
      storageAssignment: addAssignment,
      storageRequest: addRequest,
      storageWarning: addWarning,
      storageExemption: addExemption,
      storageMove: addMove,
    }[event.entity_type] || (() => {}))(event.entity_id);

    const details = event.details || {};
    addOwner(details.owner);
    addUnit(details.unit);
    addUnit(details.from_unit);
    addUnit(details.to_unit);
    addAssignment(details.assignment);
    addAssignment(details.new_assignment);
    addRequest(details.request);
    addWarning(details.warning);
    addMove(details.move);

    return { owners: [...owners], units: [...units] };
  };
};

const eventLabel = (value) => String(value || 'unknown event')
  .replaceAll('_', ' ')
  .replace(/^./, (letter) => letter.toUpperCase());

export const storageEventRows = ({
  events = [], members = [], units = [], assignments = [], requests = [],
  warnings = [], exemptions = [], moves = [],
}) => {
  const records = { assignments, requests, warnings, exemptions, moves };
  const relationsFor = createRelationsResolver(records);
  const memberById = indexById(members);
  const unitById = indexById(units);
  return [...events]
    .sort((left, right) => new Date(right.occurred_at) - new Date(left.occurred_at)
      || String(right._id).localeCompare(String(left._id)))
    .map((event) => {
      const related = relationsFor(event, records);
      return {
        ...event,
        ownerIds: related.owners,
        unitIds: related.units,
        eventLabel: eventLabel(event.event_type),
        entityLabel: eventLabel(event.entity_type),
        memberLabel: related.owners.map((id) => memberById.get(id)?.name || id).join(', ') || '—',
        unitLabel: related.units.map((id) => unitById.get(id)?.name || id).join(', ') || '—',
        actorLabel: [event.actor_type && eventLabel(event.actor_type), event.actor].filter(Boolean).join(' · ') || '—',
        detailsLabel: event.details && Object.keys(event.details).length
          ? JSON.stringify(event.details, null, 2)
          : '',
      };
    });
};

export const storageEventEntityIds = ({
  memberId, unitId, assignments = [], requests = [], warnings = [], exemptions = [], moves = [],
}) => {
  const idsForMember = () => {
    const assignmentIds = new Set(assignments.filter(({ owner }) => owner === memberId).map(({ _id }) => _id));
    return new Set([
      ...assignmentIds,
      ...requests.filter(({ owner }) => owner === memberId).map(({ _id }) => _id),
      ...warnings.filter(({ owner }) => owner === memberId).map(({ _id }) => _id),
      ...moves.filter(({ owner }) => owner === memberId).map(({ _id }) => _id),
      ...exemptions.filter(({ assignment }) => assignmentIds.has(assignment)).map(({ _id }) => _id),
    ]);
  };
  const idsForUnit = () => {
    const relatedAssignments = assignments.filter(({ unit }) => unit === unitId);
    const assignmentIds = new Set(relatedAssignments.map(({ _id }) => _id));
    const relatedMoves = moves.filter(({ from_unit, to_unit }) => from_unit === unitId || to_unit === unitId);
    const requestIds = new Set([
      ...relatedAssignments.map(({ request }) => request).filter(Boolean),
      ...relatedMoves.map(({ request }) => request).filter(Boolean),
    ]);
    return new Set([
      unitId,
      ...assignmentIds,
      ...relatedMoves.map(({ _id }) => _id),
      ...warnings.filter(({ assignment }) => assignmentIds.has(assignment)).map(({ _id }) => _id),
      ...exemptions.filter(({ assignment }) => assignmentIds.has(assignment)).map(({ _id }) => _id),
      ...requests.filter(({ _id }) => requestIds.has(_id)).map(({ _id }) => _id),
    ]);
  };

  if (!memberId && !unitId) return null;
  const memberIds = memberId ? idsForMember() : null;
  const unitIds = unitId ? idsForUnit() : null;
  const selected = memberIds && unitIds
    ? new Set([...memberIds].filter((id) => unitIds.has(id)))
    : (memberIds || unitIds);
  return [...selected].sort();
};
