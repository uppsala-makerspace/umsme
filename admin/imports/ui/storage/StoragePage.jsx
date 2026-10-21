import React, { useEffect, useMemo, useRef, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import {
  ACTIVE_STORAGE_REQUEST_STATUSES, STORAGE_MOVE_DAYS, hasActiveLabMembershipAt, newStorageCommandId, resolveStorageOwner,
} from '/imports/common/lib/storageRules';
import {
  STORAGE_ACTIONS, filterStorageQueue, filterStorageUnits, groupStorageWalls, joinStorageResults, sameSuggestionSet,
  storageReadinessPresentation, storageMemberLabel, storagePauseState, storageQueueRows, storageStatusLabel,
} from '/imports/storage/presentation';
import { storageEventRows } from '/imports/storage/eventLog';
import { AskDialog } from './AskDialog';
import { StorageActions } from './StorageActions';
import { StorageQueue } from './StorageQueue';
import { StorageWalls } from './StorageWalls';
import { StorageInventory } from './StorageInventory';
import { StorageUnitDetail } from './StorageUnitDetail';
import { StorageEventLog } from './StorageEventLog';
import {
  useOperator, useStorageDashboard, useStorageEvents, useStorageHistory, storageReadiness, storagePreview, storageCommand,
} from './data';

const errorMessage = (error) => error?.reason || error?.message || 'The operation failed. Refresh and try again.';
const endOfDay = (day) => new Date(`${day}T23:59:59`);

/**
 * /storage: the storage administration. Its parts are the pure sections
 * beside it; this keeps their state, the previews and the commands. Every
 * command carries a command id that stays the same for the same intent until
 * it succeeds, so that sending it again after a lost answer does not do it
 * twice (see common/lib/storageRules.js).
 */
export const StoragePage = () => {
  const operator = useOperator();
  const data = useStorageDashboard(operator);
  const [eventFilters, setEventFilters] = useState({});
  const events = useStorageEvents(operator, eventFilters);

  const [readiness, setReadiness] = useState(null);
  const [previews, setPreviews] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState({ section: '', message: '' });
  const [open, setOpen] = useState('');
  // A fresh preview the confirmation fetched; otherwise the open action's latest.
  const [freshPreview, setFreshPreview] = useState(null);
  const [selected, setSelected] = useState({});
  const [rowOptions, setRowOptions] = useState({});
  const [results, setResults] = useState(null);
  const [queueQuery, setQueueQuery] = useState('');
  const [editor, setEditor] = useState(null);
  const [filters, setFilters] = useState({});
  const [selectedUnitId, setSelectedUnitId] = useState(null);
  const [ask, setAsk] = useState(null);
  const commands = useRef({});

  const fail = (section, e) => setError({ section, message: typeof e === 'string' ? e : errorMessage(e) });
  const errorIn = (section) => (error.section === section ? error.message : '');
  const commandId = (intent) => {
    if (!commands.current[intent]) commands.current[intent] = newStorageCommandId();
    return commands.current[intent];
  };

  const refresh = async () => {
    if (!operator) return;
    setRefreshing(true);
    try {
      const ready = await storageReadiness();
      // Previews reconcile the same lifecycle records: one after the other.
      const mapped = {};
      for (const { id } of STORAGE_ACTIONS) mapped[id] = await storagePreview(id);
      setReadiness(ready);
      setPreviews(mapped);
      setFreshPreview(null);
      setError((current) => (current.section === 'page' ? { section: '', message: '' } : current));
    } catch (e) {
      fail('page', e);
    } finally {
      setRefreshing(false);
    }
  };
  useEffect(() => { refresh(); }, [operator]);

  // Readiness follows the published records, a moment after they change.
  const version = useMemo(() => JSON.stringify([data.walls, data.units, data.requests, data.offers, events.length].map((x) => (Array.isArray(x) ? x.length : x)))
    + (data.units || []).map((u) => `${u._id}:${u.availability_status}:${u.owner || ''}`).join(','), [data, events.length]);
  useEffect(() => {
    if (!operator || data.loading) return undefined;
    let current = true;
    const timer = setTimeout(() => storageReadiness().then((r) => { if (current) setReadiness(r); }, (e) => { if (current) fail('page', e); }), 200);
    return () => { current = false; clearTimeout(timer); };
  }, [version]);

  /** Run a command; on success forget its id and refresh. Resolves to the result, or null on failure. */
  const command = async (method, payload, intent, section) => {
    setBusy(true);
    setError({ section: '', message: '' });
    try {
      const result = await storageCommand(method, { ...payload, command_id: commandId(intent) });
      delete commands.current[intent];
      await refresh();
      return result;
    } catch (e) {
      fail(section, e);
      return null;
    } finally {
      setBusy(false);
    }
  };
  const askThen = (question) => new Promise((resolve) => setAsk({ ...question, onAnswer: resolve }));

  // The selected unit's history: of the unit, its owner's request and offer.
  const selectedUnit = (data.units || []).find((u) => u._id === selectedUnitId);
  const selectedRequest = selectedUnit?.owner && (data.requests || []).find((r) => r.owner === selectedUnit.owner && ACTIVE_STORAGE_REQUEST_STATUSES.includes(r.request_status));
  const selectedOffer = selectedUnit?.owner && (data.offers || []).find((o) => o.owner === selectedUnit.owner);
  const history = useStorageHistory(selectedUnit ? [selectedUnit._id, selectedRequest?._id, selectedOffer?._id].filter(Boolean) : []);

  if (!operator) {
    return <Alert severity="error"><strong>Not authorized.</strong> The storage role is required.</Alert>;
  }

  const { walls = [], units = [], requests = [], offers = [], members = [], users = [], messages = [] } = data;
  const memberById = new Map(members.map((m) => [m._id, m]));
  const activeRequestFor = (ownerId) => ownerId && requests.find((r) => r.owner === ownerId && ACTIVE_STORAGE_REQUEST_STATUSES.includes(r.request_status));
  const storageOwnerIdFor = (memberId) => resolveStorageOwner(memberById.get(memberId), (id) => memberById.get(id)).owner?._id || memberId;

  // --- Suggested actions -----------------------------------------------
  const preview = freshPreview || (open ? previews[open] : null);
  const openPreview = (action) => {
    setError({ section: '', message: '' });
    setOpen(action);
    setFreshPreview(null);
    setSelected({});
    setRowOptions({});
    setResults(null);
  };
  const confirm = async () => {
    setBusy(true);
    setError({ section: '', message: '' });
    try {
      const fresh = await storagePreview(open);
      if (!sameSuggestionSet(preview?.rows || [], fresh.rows)) {
        setFreshPreview(fresh);
        fail('preview', 'Suggestions changed. Review the refreshed preview and confirm again.');
        return;
      }
      const included = fresh.rows.filter((r) => selected[r.suggestion_id] !== false);
      if (open === 'review_expired_offers' && included.some((r) => !rowOptions[r.suggestion_id]?.resolution)) {
        fail('preview', 'Choose complete, extend, or cancel for every selected expired offer.');
        return;
      }
      const selections = included.map((r) => ({ suggestion_id: r.suggestion_id, ...(rowOptions[r.suggestion_id] || {}) }));
      const intent = `batch:${open}:${JSON.stringify(selections)}`;
      const result = await storageCommand('adminStorage.confirm', { action: open, selections, command_id: commandId(intent) });
      delete commands.current[intent];
      setResults(joinStorageResults(result.results, included));
      await refresh();
    } catch (e) {
      fail('preview', e);
    } finally {
      setBusy(false);
    }
  };

  // --- Queue ------------------------------------------------------------
  const queueRows = filterStorageQueue(storageQueueRows({ requests, members, units }), queueQuery);
  const editorView = editor && (() => {
    const request = editor.requestId && requests.find((r) => r._id === editor.requestId);
    return { ...editor, request, memberName: request ? storageMemberLabel(memberById.get(request.owner)) : '' };
  })();
  const saveRequest = async (v) => {
    const preference = { ...(v.floor ? { floor: v.floor } : {}), ...(v.height ? { height: v.height } : {}) };
    if (v.requestType === 'move' && !Object.keys(preference).length) return fail('queue', 'Choose at least one floor or height preference for a different-unit request.');
    const ownerId = storageOwnerIdFor(v.ownerId);
    if (!v.requestId && activeRequestFor(ownerId)) return fail('queue', 'This storage owner already has an active request. Use its queue row instead.');
    const assignment = units.find((u) => u.owner === ownerId && u.availability_status === 'occupied');
    if (v.requestType === 'allocation' && assignment) return fail('queue', 'This member already has storage. Use “Request different unit”.');
    if (v.requestType === 'move' && !assignment) return fail('queue', 'This member has no current storage. Use “Add to queue”.');
    const payload = {
      owner_id: v.ownerId, request_id: v.requestId || undefined, request_type: v.requestType,
      preference: Object.keys(preference).length ? preference : undefined,
      requested_at: v.requestedAt ? new Date(`${v.requestedAt}T00:00:00`) : undefined,
      reason: v.reason || undefined,
    };
    const result = await command('adminStorage.requests.upsert', payload, `request.upsert:${JSON.stringify(payload)}`, 'queue');
    if (result !== null) setEditor(null);
    return undefined;
  };
  const togglePause = async (request) => {
    const paused = request.pauseTarget;
    const { reason } = await askThen({ title: paused ? 'Pause the request?' : 'Resume the request?', confirm: paused ? 'Pause' : 'Resume', fields: [{ name: 'reason', label: paused ? 'Reason for pausing' : 'Reason for resuming', required: true }] });
    await command('adminStorage.requests.setPaused', { request_id: request._id, paused, reason }, `request.pause:${request._id}:${paused}:${reason}`, 'queue');
  };
  const cancelRequest = async (request) => {
    const { reason } = await askThen({ title: 'Cancel the request?', confirm: 'Cancel request', fields: [{ name: 'reason', label: 'Reason for cancelling this request', required: true }] });
    await command('adminStorage.requests.cancel', { request_id: request._id, reason }, `request.cancel:${request._id}:${reason}`, 'queue');
  };

  // --- Inventory --------------------------------------------------------
  const now = new Date();
  const wallById = new Map(walls.map((w) => [w._id, w]));
  const decorated = units.map((unit) => {
    const member = memberById.get(unit.owner);
    const overdue = unit.availability_status === 'occupied' && !!member && !hasActiveLabMembershipAt(member, now);
    return {
      ...unit,
      wall_name: wallById.get(unit.wall_id)?.name || 'Unknown wall',
      _overdue: overdue,
      _warningState: overdue ? (unit.exemption ? 'exempt' : (unit.warning ? 'warned' : 'unwarned')) : '',
    };
  });
  const visible = filterStorageUnits(decorated, filters).map((unit) => {
    const ownerName = memberById.get(unit.owner)?.name || '';
    return { ...unit, ownerName, tooltip: [unit.name, unit._overdue ? 'Overdue' : storageStatusLabel(unit.availability_status), ownerName, unit.note].filter(Boolean).join(' · ') };
  });

  // --- The selected unit ------------------------------------------------
  const unit = units.find((u) => u._id === selectedUnitId);
  const unitRequest = unit && activeRequestFor(unit.owner);
  const unitOffer = unit?.owner && offers.find((o) => o.owner === unit.owner);
  const unitAction = (method, payload, intent) => command(method, { unit_id: unit._id, ...payload }, intent, 'inventory');
  const unitOn = unit && {
    saveMetadata: (fields, acknowledged) => unitAction('adminStorage.units.update', { fields, acknowledged }, `unit.update:${unit._id}:${JSON.stringify(fields)}`),
    confirmClearance: () => unitAction('adminStorage.clearances.confirm', {}, `clear:${unit._id}`),
    assign: (payload) => unitAction('adminStorage.units.assignManual', payload, `assign:${JSON.stringify({ unit_id: unit._id, ...payload })}`),
    markReturned: async () => {
      const { reason } = await askThen({ title: 'Mark the unit returned?', confirm: 'Mark returned', fields: [{ name: 'reason', label: 'Reason for marking this unit as returned', required: true }] });
      await unitAction('adminStorage.units.markReturnedManual', { reason }, `return:${unit._id}:${reason}`);
    },
    createExemption: async () => {
      const { reason, until } = await askThen({ title: 'Exempt the unit?', confirm: 'Add exemption', fields: [{ name: 'reason', label: 'Internal exemption reason', required: true }, { name: 'until', label: 'Optional end date', type: 'date' }] });
      await unitAction('adminStorage.units.createExemption', { reason, exempt_until: until ? endOfDay(until) : undefined }, `exempt:${unit._id}:${reason}:${until || ''}`);
    },
    revokeExemption: () => unitAction('adminStorage.units.revokeExemption', {}, `revoke:${unit._id}`),
    requestRelease: async () => {
      await askThen({ title: 'Add a release request?', text: 'A release request is added for this assigned unit. No automatic notification will be sent.', confirm: 'Add release request', fields: [] });
      const payload = { owner_id: unit.owner, request_type: 'release' };
      await command('adminStorage.requests.upsert', payload, `request.upsert:${JSON.stringify(payload)}`, 'queue');
    },
    togglePause,
    cancelRequest,
    completeOffer: (offer) => command('adminStorage.offers.completeManual', { offer_id: offer._id }, `offer.complete:${offer._id}`, 'inventory'),
    extendOffer: async (offer) => {
      const { until, reason } = await askThen({ title: 'Extend the offer?', confirm: 'Extend', fields: [{ name: 'until', label: 'New deadline', type: 'date', required: true }, { name: 'reason', label: 'Reason', required: true }] });
      await command('adminStorage.offers.extendManual', { offer_id: offer._id, extend_to: endOfDay(until), reason }, `offer.extend:${offer._id}:${until}:${reason}`, 'inventory');
    },
    cancelOffer: async (offer) => {
      const { reason, cancelRequest: alsoRequest } = await askThen({
        title: 'Cancel the offer?', confirm: 'Cancel offer',
        fields: [{ name: 'reason', label: 'Cancellation reason', required: true }, { name: 'cancelRequest', label: 'Also cancel the member’s request (otherwise it returns to the queue)', type: 'checkbox' }],
      });
      await command('adminStorage.offers.cancelManual', { offer_id: offer._id, reason, cancel_request: !!alsoRequest }, `offer.cancel:${offer._id}:${reason}:${!!alsoRequest}`, 'inventory');
    },
  };

  const eventRows = storageEventRows({ events, members, units, users })
    .filter((row) => (!eventFilters.member_id || row.ownerIds.includes(eventFilters.member_id))
      && (!eventFilters.unit_id || row.unitIds.includes(eventFilters.unit_id)))
    .slice(0, 500);
  const shownReadiness = storageReadinessPresentation(readiness);

  return (
    <Box sx={{ maxWidth: 1400 }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h4" component="h1">Storage</Typography>
          <Typography variant="body2" color="text.secondary">Database-backed inventory and administrator-confirmed workflows.</Typography>
        </Box>
        <Button variant="outlined" disabled={busy || refreshing} onClick={refresh}>Refresh</Button>
      </Stack>
      {(data.loading || refreshing) && <Alert severity="info" sx={{ mt: 2 }}>Loading storage state…</Alert>}
      {errorIn('page') && <Alert severity="error" sx={{ mt: 2 }}>{errorIn('page')}</Alert>}
      {/* A safety gate, not a success notice: quiet when allocation is safe. */}
      {!['ready', 'loading'].includes(shownReadiness.state) && (
        <Alert severity={shownReadiness.state === 'blocked' ? 'error' : 'warning'} sx={{ mt: 2 }}>
          <strong>{shownReadiness.label}</strong> {shownReadiness.detail}
          {shownReadiness.reasons.length > 0 && <ul>{shownReadiness.reasons.map((r) => <li key={r}>{r}</li>)}</ul>}
        </Alert>
      )}

      <StorageActions
        previews={previews} busy={busy} open={open} onOpen={openPreview} onClose={() => setOpen('')}
        preview={preview} selected={selected} options={rowOptions} error={errorIn('preview')} results={results}
        onSelect={(id, on) => setSelected((s) => ({ ...s, [id]: on }))}
        onSelectAll={(on) => setSelected(on ? {} : Object.fromEntries((preview?.rows || []).map((r) => [r.suggestion_id, false])))}
        onOption={(id, changes) => setRowOptions((o) => ({
          ...o,
          [id]: { ...(o[id] || {}), ...changes, ...(changes.resolution === 'extend' ? { extend_to: new Date(Date.now() + STORAGE_MOVE_DAYS * 86400000) } : {}) },
        }))}
        onConfirm={confirm}
      />

      <StorageQueue
        rows={queueRows} query={queueQuery} onQueryChange={setQueueQuery} error={errorIn('queue')} busy={busy}
        editor={editorView} onOpenEditor={setEditor} onCloseEditor={() => setEditor(null)} onSaveRequest={saveRequest}
        onTogglePause={togglePause} onCancel={cancelRequest} members={members}
      />

      <StorageWalls
        walls={walls} unitCount={(wallId) => units.filter((u) => u.wall_id === wallId).length} busy={busy} error={errorIn('walls')}
        onCreate={async (fields, done) => {
          const { note, ...rest } = fields;
          const create = { ...rest, active: true, ...(note ? { note } : {}) };
          if (await command('adminStorage.walls.create', { fields: create }, `wall.create:${JSON.stringify(create)}`, 'walls') !== null) done();
        }}
        onUpdate={(wallId, fields) => command('adminStorage.walls.update', { wall_id: wallId, fields }, `wall.update:${wallId}:${JSON.stringify(fields)}`, 'walls')}
      />

      <StorageInventory
        walls={groupStorageWalls(visible, walls)} wallOptions={walls} activeWalls={walls.filter((w) => w.active)}
        filters={filters} onFilter={(field, value) => setFilters((f) => ({ ...f, [field]: value }))}
        selectedId={selectedUnitId} onSelect={setSelectedUnitId} busy={busy} error={errorIn('inventory')}
        onCreate={async (fields, done) => {
          const { note, ...rest } = fields;
          const create = { ...rest, ...(note ? { note } : {}) };
          if (await command('adminStorage.units.create', { fields: create }, `unit.create:${JSON.stringify(create)}`, 'inventory') !== null) done();
        }}
      />

      {unit && (
        <StorageUnitDetail
          unit={unit} ownerName={memberById.get(unit.owner)?.name || 'No owner'} walls={walls} members={members}
          request={unitRequest && { ...unitRequest, ...storagePauseState(unitRequest, hasActiveLabMembershipAt(memberById.get(unit.owner))) }}
          offer={unitOffer} messages={messages.filter((m) => m.member === unit.owner).slice(0, 20)} history={history}
          canRequestRelease={unit.availability_status === 'occupied' && !unitRequest && !unitOffer}
          busy={busy} error={errorIn('inventory')} on={unitOn}
        />
      )}

      <StorageEventLog
        rows={eventRows} members={members} units={[...units].sort((a, b) => String(a.name).localeCompare(String(b.name)))}
        filters={eventFilters} onFilter={(field, value) => setEventFilters((f) => ({ ...f, [field]: value }))} onClear={() => setEventFilters({})}
      />

      <AskDialog ask={ask} onClose={() => setAsk(null)} />
    </Box>
  );
};
