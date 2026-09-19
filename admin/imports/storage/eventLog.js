const indexById = (rows) => new Map(rows.map((row) => [row._id, row]));
const eventLabel = (value) => String(value || 'unknown event')
  .replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase());

const readableDetails = (details, memberById, unitById) => {
  if (!details) return '';
  const hidden = new Set(['owner', 'unit', 'from_unit', 'to_unit', 'request', 'warning', 'offer', 'message_id']);
  return Object.entries(details)
    .filter(([key]) => !hidden.has(key))
    .map(([key, value]) => {
      const label = eventLabel(key);
      if (key.endsWith('_unit')) return `${label}: ${unitById.get(value)?.name || 'Unknown unit'}`;
      if (key === 'member') return `${label}: ${memberById.get(value)?.name || 'Unknown member'}`;
      if (value instanceof Date) return `${label}: ${value.toLocaleString()}`;
      if (typeof value === 'boolean') return `${label}: ${value ? 'Yes' : 'No'}`;
      if (value && typeof value === 'object') return `${label}: ${JSON.stringify(value)}`;
      return `${label}: ${value}`;
    }).join('\n');
};

export const storageEventRows = ({ events = [], members = [], units = [], users = [] }) => {
  const memberById = indexById(members);
  const unitById = indexById(units);
  const userById = indexById(users);
  const memberByEmail = new Map(members.filter(({ email }) => email)
    .map((member) => [member.email.toLowerCase(), member]));
  const actorLabel = (event) => {
    const actorType = eventLabel(event.actor_type);
    if (event.actor_type === 'system') {
      return `${actorType} · ${event.actor === '__e2e_seed__' ? 'Test data setup' : 'Automatic reconciliation'}`;
    }
    const directMember = memberById.get(event.actor);
    const user = userById.get(event.actor);
    const accountMember = (user?.emails || [])
      .map(({ address }) => memberByEmail.get(String(address || '').toLowerCase())).find(Boolean);
    const readableActor = directMember?.name || accountMember?.name || user?.profile?.name || user?.emails?.[0]?.address;
    return [actorType, readableActor].filter(Boolean).join(' · ') || '—';
  };
  return [...events]
    .sort((left, right) => new Date(right.occurred_at) - new Date(left.occurred_at)
      || String(right._id).localeCompare(String(left._id)))
    .map((event) => {
      const ownerIds = event.member ? [event.member] : [];
      const unitIds = [...new Set([event.related_unit, event.unit,
        event.entity_type === 'storageUnit' ? event.entity_id : null].filter(Boolean))];
      return {
        ...event, ownerIds, unitIds,
        eventLabel: eventLabel(event.event_type), entityLabel: eventLabel(event.entity_type),
        memberLabel: ownerIds.map((id) => memberById.get(id)?.name || 'Unknown member').join(', ') || '—',
        unitLabel: unitIds.map((id) => unitById.get(id)?.name || 'Unknown unit').join(', ') || '—',
        actorLabel: actorLabel(event), detailsLabel: readableDetails(event.details, memberById, unitById),
      };
    });
};
