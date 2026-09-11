import './Storage.html';
import { ReactiveDict } from 'meteor/reactive-dict';
import { Random } from 'meteor/random';
import { Roles } from 'meteor/roles';
import { Members } from '/imports/common/collections/members';
import {
  StorageWalls, StorageUnits, StorageRequests, StorageAssignments, StorageWarnings, StorageExemptions,
  StorageMoves, StorageNotificationDeliveries, StorageEvents,
} from '/imports/common/collections/storage';
import {
  STORAGE_ACTIONS, bulkHeightImpact, filterStorageQueue, filterStorageUnits, groupStorageWalls,
  joinStorageResults, sameSuggestionSet, storageReadinessPresentation,
  storageMemberLabel, storageQueueRows, storageStatusClass, storageStatusLabel,
} from '/imports/storage/presentation';
import { storageEventRows } from '/imports/storage/eventLog';

const date = (value) => value instanceof Date ? value.toLocaleString() : (value || '—');
const newCommandId = () => globalThis.crypto?.randomUUID?.() || Random.id(32);
const errorMessage = (error) => error?.reason || error?.message || 'The operation failed. Refresh and try again.';
const operator = () => !!Meteor.userId() && Roles.userIsInRole(Meteor.userId(), ['admin', 'board']);
const formObject = (form) => Object.fromEntries(new FormData(form).entries());
const storageOwnerIdForMember = (memberId) => {
  const seen = new Set();
  let member = Members.findOne(memberId);
  while (member?.infamily && !seen.has(member._id)) {
    seen.add(member._id);
    member = Members.findOne(member.infamily);
  }
  return member?._id || memberId;
};
const stateCommand = (instance, intent) => {
  const key = `command:${intent}`;
  if (!instance.state.get(key)) instance.state.set(key, newCommandId());
  return instance.state.get(key);
};
const clearCommand = (instance, intent) => instance.state.set(`command:${intent}`, undefined);

const mutate = async (instance, method, payload, intent) => {
  instance.state.set('busy', true); instance.state.set('error', '');
  try {
    const result = await Meteor.callAsync(method, { ...payload, command_id: stateCommand(instance, intent) });
    clearCommand(instance, intent); await instance.refresh(); return result;
  } catch (error) { instance.state.set('error', errorMessage(error)); throw error; }
  finally { instance.state.set('busy', false); }
};

const viewRow = (row, selected, options) => ({
  ...row, ...options, selected,
  date: date(row.relevant_dates?.deadline_at || row.relevant_dates?.requested_at || row.relevant_dates?.warned_at),
  channels: [row.expected_channels?.email === 'available' ? 'Email' : null, row.expected_channels?.sms === 'available' ? 'SMS' : null].filter(Boolean).join(' + ') || 'No valid channel',
  allocationMove: row.action === 'allocate' && row.decision_type === 'move',
  expiredMove: row.action === 'review_expired_moves',
});

const requestEditorView = (editor) => {
  if (!editor) return null;
  const request = editor.requestId && StorageRequests.findOne(editor.requestId);
  const ownerId = request?.owner || editor.ownerId;
  const member = ownerId && Members.findOne(ownerId);
  const requestType = request?.request_type || (editor.mode === 'move' ? 'move' : 'allocation');
  const preference = request?.preference || {};
  return {
    ...editor,
    ownerId,
    requestId: request?._id,
    requestType,
    chooseMember: !request,
    memberName: member ? storageMemberLabel(member) : '',
    title: request ? 'Change preference' : (requestType === 'move' ? 'Request a different unit' : 'Add a member to the queue'),
    description: request
      ? 'Update what this member prefers without changing their place in the queue.'
      : (requestType === 'move' ? 'For a member who already has storage and wants a better match.' : 'For an eligible member who does not currently have storage.'),
    submitLabel: request ? 'Save preference' : (requestType === 'move' ? 'Request different unit' : 'Add to queue'),
    floorAny: !preference.floor, floor1: preference.floor === 'floor1', floor2: preference.floor === 'floor2',
    heightAny: !preference.height, heightLow: preference.height === 'low', heightHigh: preference.height === 'high',
    waitingSince: request ? date(request.requested_at) : null,
  };
};

Template.Storage.onCreated(function () {
  this.state = new ReactiveDict();
  this.state.setDefault({ busy: false, error: '', previews: {}, previewAction: '', selected: {}, rowOptions: {}, filters: {}, eventFilters: {}, queueQuery: '', bulk: {}, bulkPending: null, bulkAcknowledged: false, results: null, createWallOpen: false, createUnitOpen: false, requestEditor: null });
  this.subscribe('storageAdminDashboard');
  this.autorun(() => {
    if (!operator()) return;
    const filters = this.state.get('eventFilters') || {};
    this.subscribe('storageAdminEventLog', {
      ...(filters.member_id ? { member_id: filters.member_id } : {}),
      ...(filters.unit_id ? { unit_id: filters.unit_id } : {}),
    });
  });
  this.autorun(() => {
    const unit = StorageUnits.findOne(this.state.get('selectedUnitId'));
    if (!unit) return;
    const assignment = StorageAssignments.findOne({ unit: unit._id, ended_at: { $exists: false } });
    const request = unit.owner && StorageRequests.findOne({ owner: unit.owner, request_status: { $in: ['waiting', 'paused_ineligible', 'in_progress'] } });
    const move = unit.owner && StorageMoves.findOne({ owner: unit.owner, move_status: 'pending' });
    this.subscribe('storageAdminHistory', [unit._id, assignment?._id, request?._id, move?._id].filter(Boolean));
  });
  this.refresh = async () => {
    if (!operator()) return;
    this.state.set('loading', true);
    try {
      const readiness = await Meteor.callAsync('storageMigration.status');
      // Previews reconcile the same lifecycle records. Load them sequentially
      // so the first reconciliation completes before the next read begins.
      const mapped = {};
      for (const { id } of STORAGE_ACTIONS) mapped[id] = await Meteor.callAsync('adminStorage.preview', { action: id });
      this.state.set('readiness', readiness); this.state.set('previews', mapped);
      const open = this.state.get('previewAction'); if (open) this.state.set('preview', mapped[open]);
      this.state.set('error', '');
    } catch (error) { this.state.set('error', errorMessage(error)); }
    finally { this.state.set('loading', false); }
  };
  this.autorun(() => { if (Meteor.userId() && operator()) this.refresh(); });
});

Template.Storage.helpers({
  operator,
  loading: () => Template.instance().state.get('loading') || !Template.instance().subscriptionsReady(),
  busy: () => Template.instance().state.get('busy'), error: () => Template.instance().state.get('error'),
  readiness() {
    const presentation = storageReadinessPresentation(Template.instance().state.get('readiness'));
    // Readiness is a safety gate, not a success notification. Keep the page
    // quiet when allocation is safe and only surface states that need action.
    return ['ready', 'loading'].includes(presentation.state) ? null : presentation;
  },
  actionCards() { const state = Template.instance().state; const previews = state.get('previews') || {}; return STORAGE_ACTIONS.map((card) => ({ ...card, count: previews[card.id]?.rows?.length ?? '…', disabled: state.get('busy') || previews[card.id]?.blocked })); },
  previewOpen: () => !!Template.instance().state.get('previewAction'),
  previewTitle: () => STORAGE_ACTIONS.find(({ id }) => id === Template.instance().state.get('previewAction'))?.label,
  previewGenerated: () => date(Template.instance().state.get('preview')?.generated_at),
  previewBlocked: () => Template.instance().state.get('preview')?.blocked,
  previewEmpty: () => !(Template.instance().state.get('preview')?.rows?.length),
  retryPreview: () => Template.instance().state.get('previewAction') === 'retry_notifications',
  previewRows() { const state = Template.instance().state; const selected = state.get('selected') || {}; const options = state.get('rowOptions') || {}; return (state.get('preview')?.rows || []).map((row) => viewRow(row, selected[row.suggestion_id] !== false, options[row.suggestion_id] || {})); },
  retryRows() { const state = Template.instance().state; const selected = state.get('selected') || {}; return (state.get('preview')?.rows || []).map((row) => { const delivery = StorageNotificationDeliveries.findOne(row.delivery); return { ...row, ...delivery, renderStatus: delivery?.render_status || '—', selectionId: row.suggestion_id, selected: selected[row.suggestion_id] !== false, ownerName: row.member_name, failure: [delivery?.render_error, delivery?.email?.last_error, delivery?.sms?.last_error].filter(Boolean).join(' · ') }; }); },
  selectedCount() { const state = Template.instance().state; const selected = state.get('selected') || {}; return (state.get('preview')?.rows || []).filter(({ suggestion_id }) => selected[suggestion_id] !== false).length; },
  confirmDisabled() { const state = Template.instance().state; const selected = state.get('selected') || {}; return state.get('busy') || !(state.get('preview')?.rows || []).some(({ suggestion_id }) => selected[suggestion_id] !== false); },
  batchResults: () => Template.instance().state.get('results'), createUnitOpen: () => Template.instance().state.get('createUnitOpen'),
  storageQueue() {
    return filterStorageQueue(storageQueueRows({
      requests: StorageRequests.find().fetch(), members: Members.find().fetch(),
      assignments: StorageAssignments.find().fetch(), units: StorageUnits.find().fetch(),
    }), Template.instance().state.get('queueQuery')).map((row) => ({ ...row, waitingSince: date(row.requested_at) }));
  },
  requestEditor: () => requestEditorView(Template.instance().state.get('requestEditor')),
  bulkPending() { const state = Template.instance().state; const pending = state.get('bulkPending'); return pending && { ...pending, confirmDisabled: state.get('busy') || (pending.requiresAcknowledgement && !state.get('bulkAcknowledged')) }; },
  wallOptions: () => StorageWalls.find({}, { sort: { display_order: 1, name: 1 } }).fetch(),
  activeWallOptions: () => StorageWalls.find({ active: true }, { sort: { display_order: 1, name: 1 } }).fetch(),
  createWallOpen: () => Template.instance().state.get('createWallOpen'),
  storageWalls: () => StorageWalls.find({}, { sort: { display_order: 1, name: 1 } }).fetch().map((wall) => ({
    ...wall,
    floor1: wall.floor === 'floor1',
    floor2: wall.floor === 'floor2',
    unitCount: StorageUnits.find({ wall_id: wall._id }).count(),
  })),
  walls() {
    const state = Template.instance().state, bulk = state.get('bulk') || {}, selectedId = state.get('selectedUnitId');
    const now = new Date();
    const wallById = new Map(StorageWalls.find().fetch().map((wall) => [wall._id, wall]));
    const units = StorageUnits.find().fetch().map((unit) => {
      const member = Members.findOne(unit.owner);
      const assignment = StorageAssignments.findOne({ unit: unit._id, ended_at: { $exists: false } });
      const warning = assignment && StorageWarnings.findOne({ assignment: assignment._id, warning_status: 'open' });
      const exemption = assignment && StorageExemptions.findOne({ assignment: assignment._id, active: true });
      const overdue = !!assignment && !!member && (!(member.lab instanceof Date) || member.lab <= now);
      return { ...unit, wall_name: wallById.get(unit.wall_id)?.name || 'Unknown wall', _overdue: overdue, _warningState: overdue ? (exemption ? 'exempt' : (warning ? 'warned' : 'unwarned')) : '' };
    });
    const visible = filterStorageUnits(units, state.get('filters') || {}).map((unit) => ({ ...unit, statusLabel: storageStatusLabel(unit.availability_status), statusClass: storageStatusClass(unit.availability_status), overdueClass: unit._overdue ? 'storage-unit-overdue' : '', selectedClass: unit._id === selectedId ? 'storage-unit-selected' : '', bulkSelected: !!bulk[unit._id], ownerName: Members.findOne(unit.owner)?.name || '', tooltip: [unit.name, unit._overdue ? 'Overdue' : storageStatusLabel(unit.availability_status), Members.findOne(unit.owner)?.name, unit.note].filter(Boolean).join(' · ') }));
    return groupStorageWalls(visible, StorageWalls.find().fetch());
  },
  unitDetail() {
    const unit = StorageUnits.findOne(Template.instance().state.get('selectedUnitId')); if (!unit) return null;
    const assignment = StorageAssignments.findOne({ unit: unit._id, ended_at: { $exists: false } });
    const request = unit.owner && StorageRequests.findOne({ owner: unit.owner, request_status: { $in: ['waiting', 'paused_ineligible', 'in_progress'] } });
    const move = unit.owner && StorageMoves.findOne({ owner: unit.owner, move_status: 'pending' });
    const exemption = assignment && StorageExemptions.findOne({ assignment: assignment._id, active: true });
    const ownerEligible = !!unit.owner && !!Members.findOne(unit.owner)?.lab
      && new Date(Members.findOne(unit.owner).lab) > new Date();
    const entityIds = [unit._id, assignment?._id, request?._id, move?._id].filter(Boolean);
    return { ...unit, statusLabel: storageStatusLabel(unit.availability_status), ownerName: Members.findOne(unit.owner)?.name || 'No owner', wallChoices: StorageWalls.find({}, { sort: { display_order: 1, name: 1 } }).fetch().map((wall) => ({ ...wall, selected: wall._id === unit.wall_id, disabled: !wall.active && wall._id !== unit.wall_id, choiceLabel: `${wall.name}${wall.active ? '' : ' (inactive)'}` })), heightNone: !unit.height, heightLow: unit.height === 'low', heightHigh: unit.height === 'high', statusAvailable: unit.availability_status === 'available', statusUnavailable: unit.availability_status === 'unavailable', statusLifecycle: !['available', 'unavailable'].includes(unit.availability_status), metadataProtected: ['occupied', 'reserved'].includes(unit.availability_status), clearance: unit.availability_status === 'awaiting_clearance', assignable: unit.availability_status === 'available', canRequestRelease: !!assignment && !request && !move, activeAssignment: assignment && { ...assignment, assignedDate: date(assignment.assigned_at), exemption }, activeRequest: request && { ...request, requestedDate: date(request.requested_at), pauseTarget: request.request_status === 'waiting', pauseLabel: request.request_status === 'waiting' ? 'Pause as ineligible' : 'Resume', canTogglePause: request.request_status === 'waiting' ? !ownerEligible : (request.request_status === 'paused_ineligible' && ownerEligible) }, pendingMove: move && { ...move, deadlineDate: date(move.deadline_at) }, deliveries: unit.owner ? StorageNotificationDeliveries.find({ owner: unit.owner }, { sort: { created_at: -1 }, limit: 20 }).fetch() : [], history: StorageEvents.find({ entity_id: { $in: entityIds } }, { sort: { occurred_at: -1 }, limit: 50 }).fetch().map((event) => ({ ...event, date: date(event.occurred_at) })) };
  },
  memberOptions: () => Members.find({}, { sort: { name: 1 } }).fetch()
    .map((member) => ({ ...member, pickerLabel: storageMemberLabel(member) })),
  eventMemberOptions: () => Members.find({}, { sort: { name: 1 } }).fetch()
    .map((member) => ({ ...member, pickerLabel: storageMemberLabel(member) })),
  eventUnitOptions: () => StorageUnits.find({}, { sort: { name: 1 } }).fetch(),
  eventLogRows() {
    const state = Template.instance().state;
    const filters = state.get('eventFilters') || {};
    return storageEventRows({
      events: StorageEvents.find().fetch(),
      members: Members.find().fetch(),
      units: StorageUnits.find().fetch(),
      assignments: StorageAssignments.find().fetch(),
      requests: StorageRequests.find().fetch(),
      warnings: StorageWarnings.find().fetch(),
      exemptions: StorageExemptions.find().fetch(),
      moves: StorageMoves.find().fetch(),
      users: Meteor.users.find().fetch(),
    }).filter((row) => (!filters.member_id || row.ownerIds.includes(filters.member_id))
      && (!filters.unit_id || row.unitIds.includes(filters.unit_id)))
      .slice(0, 500)
      .map((row) => ({
        ...row,
        date: date(row.occurred_at),
        memberId: row.ownerIds.length === 1 ? row.ownerIds[0] : null,
      }));
  },
});

Template.Storage.events({
  'click .refresh-storage'(e, i) { e.preventDefault(); i.refresh(); },
  'click .open-preview'(e, i) { const action = e.currentTarget.dataset.action; i.state.set('previewAction', action); i.state.set('preview', i.state.get('previews')?.[action]); i.state.set('selected', {}); i.state.set('rowOptions', {}); i.state.set('results', null); },
  'click .close-preview'(e, i) { e.preventDefault(); i.state.set('previewAction', ''); },
  'change .select-suggestion, change .select-retry'(e, i) { i.state.set('selected', { ...(i.state.get('selected') || {}), [e.currentTarget.dataset.id]: e.currentTarget.checked }); },
  'change .requires-inspection'(e, i) { const id = e.currentTarget.dataset.id; i.state.set('rowOptions', { ...(i.state.get('rowOptions') || {}), [id]: { ...(i.state.get('rowOptions')?.[id] || {}), requires_inspection: e.currentTarget.checked } }); },
  'change .move-resolution'(e, i) { const id = e.currentTarget.dataset.id, resolution = e.currentTarget.value; i.state.set('rowOptions', { ...(i.state.get('rowOptions') || {}), [id]: { resolution, ...(resolution === 'extend' ? { extend_to: new Date(Date.now() + 14 * 86400000) } : {}) } }); },
  async 'click .confirm-preview'(e, i) {
    e.preventDefault(); const action = i.state.get('previewAction'), selected = i.state.get('selected') || {}, original = i.state.get('preview')?.rows || [];
    i.state.set('busy', true); i.state.set('error', '');
    try {
      const fresh = await Meteor.callAsync('adminStorage.preview', { action });
      if (!sameSuggestionSet(original, fresh.rows)) { i.state.set('preview', fresh); i.state.set('error', 'Suggestions changed. Review the refreshed preview and confirm again.'); return; }
      if (action === 'retry_notifications') {
        const results = [];
        for (const row of fresh.rows.filter(({ suggestion_id }) => selected[suggestion_id] !== false)) {
          const intent = `notification.retry:${row.delivery}:${row.failed_channels.join(',')}`;
          try { const value = await Meteor.callAsync('adminStorage.notifications.retry', { delivery_id: row.delivery, channels: row.failed_channels, command_id: stateCommand(i, intent) }); clearCommand(i, intent); results.push({ status: 'applied', label: row.member_name, ...value }); } catch (error) { results.push({ status: 'failed', label: row.member_name, reason: errorMessage(error) }); }
        }
        i.state.set('results', results);
      } else {
        const options = i.state.get('rowOptions') || {};
        if (action === 'review_expired_moves' && fresh.rows.some(({ suggestion_id }) => selected[suggestion_id] !== false && !options[suggestion_id]?.resolution)) {
          i.state.set('error', 'Choose complete, extend, or cancel for every selected expired move.'); return;
        }
        const confirmedRows = fresh.rows.filter(({ suggestion_id }) => selected[suggestion_id] !== false);
        const selections = confirmedRows.map(({ suggestion_id }) => ({ suggestion_id, ...(options[suggestion_id] || {}) }));
        const intent = `batch:${action}:${JSON.stringify(selections)}`;
        const result = await Meteor.callAsync('adminStorage.confirm', { action, selections, command_id: stateCommand(i, intent) });
        clearCommand(i, intent);
        i.state.set('results', joinStorageResults(result.results, confirmedRows));
      }
      await i.refresh();
    } catch (error) { i.state.set('error', errorMessage(error)); } finally { i.state.set('busy', false); }
  },
  'click .toggle-create-wall'(e, i) { e.preventDefault(); i.state.set('createWallOpen', !i.state.get('createWallOpen')); },
  async 'submit .create-wall-form'(e, i) {
    e.preventDefault();
    const fields = formObject(e.currentTarget);
    fields.display_order = Number(fields.display_order);
    fields.column_count = Number(fields.column_count);
    fields.row_count = Number(fields.row_count);
    fields.active = true;
    if (!fields.note) delete fields.note;
    try { await mutate(i, 'adminStorage.walls.create', { fields }, `wall.create:${JSON.stringify(fields)}`); e.currentTarget.reset(); i.state.set('createWallOpen', false); } catch (_) {}
  },
  async 'submit .edit-wall-form'(e, i) {
    e.preventDefault();
    const v = formObject(e.currentTarget), wall_id = e.currentTarget.dataset.id;
    const fields = { name: v.name, floor: v.floor, display_order: Number(v.display_order), column_count: Number(v.column_count), row_count: Number(v.row_count), active: v.active === 'on', note: v.note || null };
    try { await mutate(i, 'adminStorage.walls.update', { wall_id, fields }, `wall.update:${wall_id}:${JSON.stringify(fields)}`); } catch (_) {}
  },
  'click .toggle-create-unit'(e, i) { e.preventDefault(); i.state.set('createUnitOpen', !i.state.get('createUnitOpen')); },
  async 'submit .create-unit-form'(e, i) { e.preventDefault(); const fields = formObject(e.currentTarget); fields.column = Number(fields.column); fields.row = Number(fields.row); if (!fields.height) delete fields.height; if (!fields.note) delete fields.note; try { await mutate(i, 'adminStorage.units.create', { fields }, `unit.create:${JSON.stringify(fields)}`); e.currentTarget.reset(); i.state.set('createUnitOpen', false); } catch (_) {} },
  'input .storage-filter, change .storage-filter'(e, i) { i.state.set('filters', { ...(i.state.get('filters') || {}), [e.currentTarget.dataset.filter]: e.currentTarget.value }); },
  'change .storage-owner-filter'(e, i) { i.state.set('filters', { ...(i.state.get('filters') || {}), owner: e.currentTarget.checked }); },
  'change .storage-overdue-filter'(e, i) { i.state.set('filters', { ...(i.state.get('filters') || {}), overdue: e.currentTarget.checked }); },
  'input .storage-queue-search'(e, i) { i.state.set('queueQuery', e.currentTarget.value); },
  'input .storage-event-filter'(e, i) {
    const input = e.currentTarget;
    const match = [...(input.list?.options || [])].find((option) => option.value === input.value);
    input.setCustomValidity(input.value && !match ? 'Choose a value from the suggestions.' : '');
    if (input.value && !match) return;
    i.state.set('eventFilters', {
      ...(i.state.get('eventFilters') || {}),
      [input.dataset.filter]: match?.dataset.id || '',
    });
  },
  'click .clear-storage-event-filters'(e, i) {
    e.preventDefault();
    i.state.set('eventFilters', {});
    e.currentTarget.closest('.storage-event-log').querySelectorAll('.storage-event-filter')
      .forEach((field) => { field.value = ''; });
  },
  'click .open-request-flow'(e, i) { e.preventDefault(); i.state.set('requestEditor', { mode: e.currentTarget.dataset.mode }); },
  'click .close-request-editor'(e, i) { e.preventDefault(); i.state.set('requestEditor', null); },
  'click .edit-queue-preference, click .correct-queue-date'(e, i) {
    e.preventDefault();
    i.state.set('requestEditor', { mode: 'edit', requestId: e.currentTarget.dataset.id, advancedOpen: e.currentTarget.classList.contains('correct-queue-date') });
  },
  'input .queue-date-correction'(e) {
    const reason = e.currentTarget.form.elements.reason;
    reason.required = !!e.currentTarget.value;
    if (!e.currentTarget.value) reason.setCustomValidity('');
  },
  'input .storage-member-picker'(e) {
    const input = e.currentTarget;
    const match = [...(input.list?.options || [])].find((option) => option.value === input.value);
    input.form.elements.owner_id.value = match?.dataset.id || '';
    input.setCustomValidity(input.value && !match ? 'Choose a member from the suggestions.' : '');
  },
  'click .select-unit'(e, i) { i.state.set('selectedUnitId', e.currentTarget.dataset.id); },
  'change .bulk-unit'(e, i) { i.state.set('bulk', { ...(i.state.get('bulk') || {}), [e.currentTarget.dataset.id]: e.currentTarget.checked }); i.state.set('bulkPending', null); i.state.set('bulkAcknowledged', false); },
  'click .bulk-height'(e, i) {
    const unit_ids = Object.entries(i.state.get('bulk') || {}).filter(([, yes]) => yes).map(([id]) => id).sort();
    if (!unit_ids.length) { i.state.set('error', 'Select at least one unit.'); return; }
    const height = e.currentTarget.dataset.height;
    i.state.set('bulkPending', { unit_ids, height, ...bulkHeightImpact(StorageUnits.find().fetch(), unit_ids) });
    i.state.set('bulkAcknowledged', false);
  },
  'change .bulk-acknowledgement'(e, i) { i.state.set('bulkAcknowledged', e.currentTarget.checked); },
  async 'click .confirm-bulk-height'(e, i) {
    e.preventDefault(); const pending = i.state.get('bulkPending'); if (!pending) return;
    const acknowledged = pending.requiresAcknowledgement && i.state.get('bulkAcknowledged') === true;
    try { await mutate(i, 'adminStorage.units.bulkSetHeight', { unit_ids: pending.unit_ids, height: pending.height, acknowledged }, `bulk.height:${pending.height}:${pending.unit_ids.join(',')}`); i.state.set('bulk', {}); i.state.set('bulkPending', null); i.state.set('bulkAcknowledged', false); } catch (_) {}
  },
  async 'submit .edit-unit-form'(e, i) { e.preventDefault(); const v = formObject(e.currentTarget), unit_id = e.currentTarget.dataset.id; const fields = { name: v.name, height: v.height || null, wall_id: v.wall_id, column: Number(v.column), row: Number(v.row), availability_status: v.availability_status, note: v.note || null }; try { await mutate(i, 'adminStorage.units.update', { unit_id, fields, acknowledged: v.acknowledged === 'on' }, `unit.update:${unit_id}:${JSON.stringify(fields)}`); } catch (_) {} },
  async 'submit .manual-assign-form'(e, i) { e.preventDefault(); const v = formObject(e.currentTarget), payload = { unit_id: e.currentTarget.dataset.id, owner_id: v.owner_id, override: v.override === 'on', reason: v.reason || undefined }; try { await mutate(i, 'adminStorage.assignments.assignManual', payload, `assign:${JSON.stringify(payload)}`); } catch (_) {} },
  async 'click .confirm-clearance'(e, i) { const unit_id = e.currentTarget.dataset.id; try { await mutate(i, 'adminStorage.clearances.confirm', { unit_id }, `clear:${unit_id}`); } catch (_) {} },
  async 'click .end-assignment'(e, i) { const assignment_id = e.currentTarget.dataset.id, reason = prompt('Reason for ending/correcting this assignment:'); if (reason) try { await mutate(i, 'adminStorage.assignments.endManual', { assignment_id, reason }, `end:${assignment_id}:${reason}`); } catch (_) {} },
  async 'click .create-exemption'(e, i) { const assignment_id = e.currentTarget.dataset.id, reason = prompt('Internal exemption reason:'); if (!reason) return; const until = prompt('Optional end date (YYYY-MM-DD), or blank:') || '', exempt_until = until ? new Date(`${until}T23:59:59`) : undefined; try { await mutate(i, 'adminStorage.exemptions.create', { assignment_id, reason, exempt_until }, `exempt:${assignment_id}:${reason}:${until}`); } catch (_) {} },
  async 'click .revoke-exemption'(e, i) { const exemption_id = e.currentTarget.dataset.id; try { await mutate(i, 'adminStorage.exemptions.revoke', { exemption_id }, `revoke:${exemption_id}`); } catch (_) {} },
  async 'click .cancel-request'(e, i) { const request_id = e.currentTarget.dataset.id, reason = prompt('Reason for cancelling this request:'); if (reason) try { await mutate(i, 'adminStorage.requests.cancel', { request_id, reason }, `request.cancel:${request_id}:${reason}`); } catch (_) {} },
  async 'click .toggle-request-pause'(e, i) { const request_id = e.currentTarget.dataset.id, paused = e.currentTarget.dataset.paused === 'true', reason = prompt(paused ? 'Reason for pausing:' : 'Reason for resuming:'); if (reason) try { await mutate(i, 'adminStorage.requests.setPaused', { request_id, paused, reason }, `request.pause:${request_id}:${paused}:${reason}`); } catch (_) {} },
  async 'submit .request-goal-form'(e, i) {
    e.preventDefault();
    const form = e.currentTarget, v = formObject(form);
    if (v.requested_at && !String(v.reason || '').trim()) {
      form.elements.reason.setCustomValidity('A reason is required when correcting the waiting date.');
      form.reportValidity(); return;
    }
    form.elements.reason.setCustomValidity('');
    const preference = { ...(v.floor ? { floor: v.floor } : {}), ...(v.height ? { height: v.height } : {}) };
    if (v.request_type === 'move' && !Object.keys(preference).length) {
      i.state.set('error', 'Choose at least one floor or height preference for a different-unit request.'); return;
    }
    const storageOwnerId = storageOwnerIdForMember(v.owner_id);
    const activeRequest = !v.request_id && StorageRequests.findOne({ owner: storageOwnerId, request_status: { $in: ['waiting', 'paused_ineligible', 'in_progress'] } });
    const assignment = StorageAssignments.findOne({ owner: storageOwnerId, ended_at: { $exists: false } });
    if (activeRequest) { i.state.set('error', 'This storage owner already has an active request. Use its queue row instead.'); return; }
    if (v.request_type === 'allocation' && assignment) { i.state.set('error', 'This member already has storage. Use “Request different unit”.'); return; }
    if (v.request_type === 'move' && !assignment) { i.state.set('error', 'This member has no current storage. Use “Add to queue”.'); return; }
    const payload = { owner_id: v.owner_id, request_id: v.request_id || undefined, request_type: v.request_type, preference: Object.keys(preference).length ? preference : undefined, requested_at: v.requested_at ? new Date(`${v.requested_at}T00:00:00`) : undefined, reason: v.reason || undefined };
    try { await mutate(i, 'adminStorage.requests.upsert', payload, `request.upsert:${JSON.stringify(payload)}`); i.state.set('requestEditor', null); } catch (_) {}
  },
  async 'click .request-release'(e, i) {
    e.preventDefault(); const owner_id = e.currentTarget.dataset.owner;
    if (!confirm('Add a release request for this assigned unit? No automatic notification will be sent.')) return;
    const payload = { owner_id, request_type: 'release' };
    try { await mutate(i, 'adminStorage.requests.upsert', payload, `request.upsert:${JSON.stringify(payload)}`); } catch (_) {}
  },
  async 'click .complete-move'(e, i) { const move_id = e.currentTarget.dataset.id; try { await mutate(i, 'adminStorage.moves.completeManual', { move_id }, `move.complete:${move_id}`); } catch (_) {} },
  async 'click .extend-move'(e, i) { const move_id = e.currentTarget.dataset.id, value = prompt('New deadline (YYYY-MM-DD):'), reason = value && prompt('Reason:'); if (value && reason) try { await mutate(i, 'adminStorage.moves.extendManual', { move_id, extend_to: new Date(`${value}T23:59:59`), reason }, `move.extend:${move_id}:${value}:${reason}`); } catch (_) {} },
  async 'click .cancel-move'(e, i) { const move_id = e.currentTarget.dataset.id, reason = prompt('Cancellation reason:'); if (!reason) return; const cancel_request = confirm('Also cancel the member request? OK cancels it; Cancel returns it to queue.'); try { await mutate(i, 'adminStorage.moves.cancelManual', { move_id, reason, cancel_request }, `move.cancel:${move_id}:${reason}:${cancel_request}`); } catch (_) {} },
});
