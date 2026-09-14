import './Storage.html';
import { ReactiveDict } from 'meteor/reactive-dict';
import { Random } from 'meteor/random';
import { Roles } from 'meteor/roles';
import { STORAGE_OPERATOR_ROLES } from '/imports/common/lib/storageRules';
import { Members } from '/imports/common/collections/members';
import { Messages } from '/imports/common/collections/messages';
import {
  StorageWalls, StorageUnits, StorageRequests, StorageOffers, StorageEvents,
} from '/imports/common/collections/storage';
import {
  STORAGE_ACTIONS, filterStorageQueue, filterStorageUnits, groupStorageWalls,
  joinStorageResults, sameSuggestionSet, storageReadinessPresentation,
  storageActionReasonLabel, storageResultSummary,
  storageMemberLabel, storageQueueRows, storageStatusClass, storageStatusLabel,
} from '/imports/storage/presentation';
import { storageEventRows } from '/imports/storage/eventLog';

const date = (value) => value instanceof Date ? value.toLocaleString() : (value || '—');
const newCommandId = () => globalThis.crypto?.randomUUID?.() || Random.id(32);
const errorMessage = (error) => error?.reason || error?.message || 'The operation failed. Refresh and try again.';
const setError = (instance, message, section = 'page') => {
  instance.state.set('error', message);
  instance.state.set('errorSection', message ? section : '');
};
const scopedError = (section) => {
  const state = Template.instance().state;
  return state.get('errorSection') === section ? state.get('error') : '';
};
const operator = () => !!Meteor.userId() &&
  Roles.userIsInRole(Meteor.userId(), STORAGE_OPERATOR_ROLES);
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
const activeRequestForOwner = (ownerId) => ownerId && StorageRequests.findOne({
  owner: ownerId,
  request_status: { $in: ['waiting', 'paused_ineligible', 'in_progress'] },
});
const setStateMapValue = (instance, stateKey, itemKey, value) => {
  instance.state.set(stateKey, {
    ...(instance.state.get(stateKey) || {}),
    [itemKey]: value,
  });
};
const setRowOption = (instance, suggestionId, changes) => {
  const options = instance.state.get('rowOptions') || {};
  setStateMapValue(instance, 'rowOptions', suggestionId, {
    ...(options[suggestionId] || {}),
    ...changes,
  });
};

const mutate = async (instance, method, payload, intent, errorSection = 'page') => {
  instance.state.set('busy', true);
  setError(instance, '');
  try {
    const result = await Meteor.callAsync(method, { ...payload, command_id: stateCommand(instance, intent) });
    clearCommand(instance, intent);
    await instance.refresh();
    return result;
  } catch (error) {
    setError(instance, errorMessage(error), errorSection);
    throw error;
  } finally {
    instance.state.set('busy', false);
  }
};

const viewRow = (row, selected, options) => ({
  ...row, ...options, selected,
  date: date(row.relevant_dates?.deadline_at || row.relevant_dates?.requested_at || row.relevant_dates?.warned_at),
  reasonLabel: storageActionReasonLabel(row.reason_code),
  channels: ['allocate', 'warn', 'remind', 'reclaim', 'release'].includes(row.action)
    ? (row.expected_channels?.email === 'available' ? 'Email + app message' : 'App message only')
    : 'No automatic message',
  allocationOffer: row.action === 'allocate' && row.decision_type === 'move',
  expiredOffer: row.action === 'review_expired_offers',
  reclamation: row.action === 'reclaim',
  warningContactLabel: row.warning_delivered ? 'Warning delivered' : 'No delivered warning',
});

const requestEditorView = (editor) => {
  if (!editor) return null;
  const request = editor.requestId && StorageRequests.findOne(editor.requestId);
  const ownerId = request?.owner || editor.ownerId;
  const member = ownerId && Members.findOne(ownerId);
  const requestType = request?.request_type || (editor.mode === 'move' ? 'move' : 'allocation');
  const preference = request?.preference || {};
  const newRequestTitle = requestType === 'move'
    ? 'Request a different unit'
    : 'Add a member to the queue';
  const newRequestDescription = requestType === 'move'
    ? 'For a member who already has storage and wants a better match.'
    : 'For an eligible member who does not currently have storage.';
  const newRequestSubmitLabel = requestType === 'move'
    ? 'Request different unit'
    : 'Add to queue';
  return {
    ...editor,
    ownerId,
    requestId: request?._id,
    requestType,
    chooseMember: !request,
    memberName: member ? storageMemberLabel(member) : '',
    title: request ? 'Change preference' : newRequestTitle,
    description: request
      ? 'Update what this member prefers without changing their place in the queue.'
      : newRequestDescription,
    submitLabel: request ? 'Save preference' : newRequestSubmitLabel,
    floorAny: !preference.floor, floor1: preference.floor === 'floor1', floor2: preference.floor === 'floor2',
    heightAny: !preference.height, heightLow: preference.height === 'low', heightHigh: preference.height === 'high',
    waitingSince: request ? date(request.requested_at) : null,
  };
};

const unitWallChoices = (unit) => StorageWalls.find({}, {
  sort: { display_order: 1, name: 1 },
}).fetch().map((wall) => ({
  ...wall,
  selected: wall._id === unit.wall_id,
  disabled: !wall.active && wall._id !== unit.wall_id,
  choiceLabel: `${wall.name}${wall.active ? '' : ' (inactive)'}`,
}));

const activeRequestView = (request, ownerEligible) => request && ({
  ...request,
  requestedDate: date(request.requested_at),
  pauseTarget: request.request_status === 'waiting',
  pauseLabel: request.request_status === 'waiting' ? 'Pause as ineligible' : 'Resume',
  canTogglePause: request.request_status === 'waiting'
    ? !ownerEligible
    : request.request_status === 'paused_ineligible' && ownerEligible,
});

const storageMessagesForOwner = (ownerId) => ownerId
  ? Messages.find({ member: ownerId, type: 'storage' }, {
    sort: { senddate: -1 }, limit: 20,
  }).fetch().map((message) => ({ ...message, sentDate: date(message.senddate) }))
  : [];

const storageHistoryForUnit = (unit, entityIds) => StorageEvents.find({
  $or: [
    { entity_id: { $in: entityIds } },
    { unit: unit._id },
    { related_unit: unit._id },
  ],
}, {
  sort: { occurred_at: -1 }, limit: 50,
}).fetch().map((event) => ({ ...event, date: date(event.occurred_at) }));

const storageUnitView = (unit) => {
  const owner = unit.owner && Members.findOne(unit.owner);
  const request = activeRequestForOwner(unit.owner);
  const offer = unit.owner && StorageOffers.findOne({ owner: unit.owner });
  const occupied = unit.availability_status === 'occupied';
  const occupancy = occupied ? {
    _id: unit._id,
    owner: unit.owner,
    unit: unit._id,
    assigned_at: unit.assigned_at,
  } : null;
  const ownerEligible = owner?.lab instanceof Date && owner.lab > new Date();
  const entityIds = [unit._id, request?._id, offer?._id].filter(Boolean);

  return {
    ...unit,
    statusLabel: storageStatusLabel(unit.availability_status),
    ownerName: owner?.name || 'No owner',
    wallChoices: unitWallChoices(unit),
    statusAvailable: unit.availability_status === 'available',
    statusUnavailable: unit.availability_status === 'unavailable',
    statusLifecycle: !['available', 'unavailable'].includes(unit.availability_status),
    metadataProtected: ['occupied', 'reserved'].includes(unit.availability_status),
    clearance: unit.availability_status === 'awaiting_clearance',
    assignable: unit.availability_status === 'available',
    canRequestRelease: occupied && !request && !offer,
    currentOccupancy: occupancy && {
      ...occupancy,
      assignedDate: date(occupancy.assigned_at),
      exemption: unit.exemption,
    },
    activeRequest: activeRequestView(request, ownerEligible),
    pendingOffer: offer && { ...offer, deadlineDate: date(offer.deadline_at) },
    messages: storageMessagesForOwner(unit.owner),
    history: storageHistoryForUnit(unit, entityIds),
  };
};

Template.Storage.onCreated(function () {
  this.state = new ReactiveDict();
  this.state.setDefault({
    busy: false,
    error: '',
    errorSection: '',
    previews: {},
    previewAction: '',
    selected: {},
    rowOptions: {},
    filters: {},
    eventFilters: {},
    queueQuery: '',
    results: null,
    createWallOpen: false,
    createUnitOpen: false,
    requestEditor: null,
  });
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
    const request = activeRequestForOwner(unit.owner);
    const move = unit.owner && StorageOffers.findOne({ owner: unit.owner });
    this.subscribe('storageAdminHistory', [unit._id, request?._id, move?._id].filter(Boolean));
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
      this.state.set('readiness', readiness);
      this.state.set('previews', mapped);
      const open = this.state.get('previewAction');
      if (open) this.state.set('preview', mapped[open]);
      if (this.state.get('errorSection') === 'page') setError(this, '');
    } catch (error) {
      setError(this, errorMessage(error), 'page');
    } finally {
      this.state.set('loading', false);
    }
  };
  this.autorun(() => {
    if (Meteor.userId() && operator()) this.refresh();
  });
});

Template.Storage.helpers({
  operator,
  loading: () => Template.instance().state.get('loading') || !Template.instance().subscriptionsReady(),
  busy: () => Template.instance().state.get('busy'),
  pageError: () => scopedError('page'), previewError: () => scopedError('preview'),
  queueError: () => scopedError('queue'), wallsError: () => scopedError('walls'),
  inventoryError: () => scopedError('inventory'),
  readiness() {
    const presentation = storageReadinessPresentation(Template.instance().state.get('readiness'));
    // Readiness is a safety gate, not a success notification. Keep the page
    // quiet when allocation is safe and only surface states that need action.
    return ['ready', 'loading'].includes(presentation.state) ? null : presentation;
  },
  actionCards() {
    const state = Template.instance().state;
    const previews = state.get('previews') || {};
    return STORAGE_ACTIONS.map((card) => ({
      ...card,
      count: previews[card.id]?.rows?.length ?? '…',
      disabled: state.get('busy') || previews[card.id]?.blocked,
    }));
  },
  previewOpen: () => !!Template.instance().state.get('previewAction'),
  previewTitle: () => STORAGE_ACTIONS.find(({ id }) => id === Template.instance().state.get('previewAction'))?.label,
  previewGenerated: () => date(Template.instance().state.get('preview')?.generated_at),
  previewBlocked: () => Template.instance().state.get('preview')?.blocked,
  previewEmpty: () => !(Template.instance().state.get('preview')?.rows?.length),
  previewRows() {
    const state = Template.instance().state;
    const selected = state.get('selected') || {};
    const options = state.get('rowOptions') || {};
    return (state.get('preview')?.rows || []).map((row) => viewRow(
      row,
      selected[row.suggestion_id] !== false,
      options[row.suggestion_id] || {},
    ));
  },
  selectedCount() {
    const state = Template.instance().state;
    const selected = state.get('selected') || {};
    return (state.get('preview')?.rows || [])
      .filter(({ suggestion_id }) => selected[suggestion_id] !== false)
      .length;
  },
  confirmDisabled() {
    const state = Template.instance().state;
    const selected = state.get('selected') || {};
    const options = state.get('rowOptions') || {};
    const rows = (state.get('preview')?.rows || []).filter(({ suggestion_id }) => selected[suggestion_id] !== false);
    return state.get('busy') || !rows.length || rows.some((row) => row.manual_contact_required &&
      (options[row.suggestion_id]?.manual_contact_confirmed !== true ||
       !options[row.suggestion_id]?.manual_contact_reason?.trim()));
  },
  batchResults: () => Template.instance().state.get('results'),
  batchResultSummary: () => storageResultSummary(Template.instance().state.get('results') || []),
  createUnitOpen: () => Template.instance().state.get('createUnitOpen'),
  storageQueue() {
    const state = Template.instance().state;
    const rows = storageQueueRows({
      requests: StorageRequests.find().fetch(), members: Members.find().fetch(),
      units: StorageUnits.find().fetch(),
    });
    return filterStorageQueue(rows, state.get('queueQuery'))
      .map((row) => ({ ...row, waitingSince: date(row.requested_at) }));
  },
  requestEditor: () => requestEditorView(Template.instance().state.get('requestEditor')),
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
    const state = Template.instance().state;
    const selectedId = state.get('selectedUnitId');
    const now = new Date();
    const walls = StorageWalls.find().fetch();
    const wallById = new Map(walls.map((wall) => [wall._id, wall]));
    const units = StorageUnits.find().fetch().map((unit) => {
      const member = Members.findOne(unit.owner);
      const warning = unit.warning;
      const exemption = unit.exemption;
      const membershipExpired = !(member?.lab instanceof Date) || member.lab <= now;
      const overdue = unit.availability_status === 'occupied' && !!member && membershipExpired;
      let warningState = '';
      if (overdue) warningState = exemption ? 'exempt' : (warning ? 'warned' : 'unwarned');
      return {
        ...unit,
        wall_name: wallById.get(unit.wall_id)?.name || 'Unknown wall',
        _overdue: overdue,
        _warningState: warningState,
      };
    });
    const visible = filterStorageUnits(units, state.get('filters') || {}).map((unit) => {
      const ownerName = Members.findOne(unit.owner)?.name || '';
      const statusLabel = storageStatusLabel(unit.availability_status);
      return {
        ...unit,
        statusLabel,
        statusClass: storageStatusClass(unit.availability_status),
        overdueClass: unit._overdue ? 'storage-unit-overdue' : '',
        selectedClass: unit._id === selectedId ? 'storage-unit-selected' : '',
        ownerName,
        tooltip: [
          unit.name,
          unit._overdue ? 'Overdue' : statusLabel,
          ownerName,
          unit.note,
        ].filter(Boolean).join(' · '),
      };
    });
    return groupStorageWalls(visible, walls);
  },
  unitDetail() {
    const unit = StorageUnits.findOne(Template.instance().state.get('selectedUnitId'));
    return unit ? storageUnitView(unit) : null;
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
  'click .refresh-storage'(event, instance) {
    event.preventDefault();
    instance.refresh();
  },
  'click .open-preview'(event, instance) {
    const action = event.currentTarget.dataset.action;
    setError(instance, '');
    instance.state.set('previewAction', action);
    instance.state.set('preview', instance.state.get('previews')?.[action]);
    instance.state.set('selected', {});
    instance.state.set('rowOptions', {});
    instance.state.set('results', null);
  },
  'click .close-preview'(event, instance) {
    event.preventDefault();
    instance.state.set('previewAction', '');
  },
  'change .select-suggestion'(event, instance) {
    setStateMapValue(
      instance,
      'selected',
      event.currentTarget.dataset.id,
      event.currentTarget.checked,
    );
  },
  'change .requires-inspection'(event, instance) {
    setRowOption(instance, event.currentTarget.dataset.id, {
      requires_inspection: event.currentTarget.checked,
    });
  },
  'change .manual-contact-confirmed'(event, instance) {
    setRowOption(instance, event.currentTarget.dataset.id, {
      manual_contact_confirmed: event.currentTarget.checked,
    });
  },
  'input .manual-contact-reason'(event, instance) {
    setRowOption(instance, event.currentTarget.dataset.id, {
      manual_contact_reason: event.currentTarget.value,
    });
  },
  'change .offer-resolution'(event, instance) {
    const resolution = event.currentTarget.value;
    setRowOption(instance, event.currentTarget.dataset.id, {
      resolution,
      ...(resolution === 'extend' ? {
        extend_to: new Date(Date.now() + 14 * 86400000),
      } : {}),
    });
  },
  async 'click .confirm-preview'(event, instance) {
    event.preventDefault();
    const action = instance.state.get('previewAction');
    const selected = instance.state.get('selected') || {};
    const original = instance.state.get('preview')?.rows || [];
    instance.state.set('busy', true);
    setError(instance, '');
    try {
      const fresh = await Meteor.callAsync('adminStorage.preview', { action });
      if (!sameSuggestionSet(original, fresh.rows)) {
        instance.state.set('preview', fresh);
        setError(
          instance,
          'Suggestions changed. Review the refreshed preview and confirm again.',
          'preview',
        );
        return;
      }
      const options = instance.state.get('rowOptions') || {};
      const missingOfferResolution = action === 'review_expired_offers'
        && fresh.rows.some(({ suggestion_id }) => (
          selected[suggestion_id] !== false && !options[suggestion_id]?.resolution
        ));
      if (missingOfferResolution) {
        setError(
          instance,
          'Choose complete, extend, or cancel for every selected expired offer.',
          'preview',
        );
        return;
      }
      const confirmedRows = fresh.rows
        .filter(({ suggestion_id }) => selected[suggestion_id] !== false);
      const selections = confirmedRows.map(({ suggestion_id }) => ({
        suggestion_id,
        ...(options[suggestion_id] || {}),
      }));
      const intent = `batch:${action}:${JSON.stringify(selections)}`;
      const result = await Meteor.callAsync('adminStorage.confirm', {
        action,
        selections,
        command_id: stateCommand(instance, intent),
      });
      clearCommand(instance, intent);
      instance.state.set('results', joinStorageResults(result.results, confirmedRows));
      await instance.refresh();
    } catch (error) {
      setError(instance, errorMessage(error), 'preview');
    } finally {
      instance.state.set('busy', false);
    }
  },
  'click .toggle-create-wall'(event, instance) {
    event.preventDefault();
    instance.state.set('createWallOpen', !instance.state.get('createWallOpen'));
  },
  async 'submit .create-wall-form'(event, instance) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = formObject(form);
    fields.display_order = Number(fields.display_order);
    fields.column_count = Number(fields.column_count);
    fields.row_count = Number(fields.row_count);
    fields.active = true;
    if (!fields.note) delete fields.note;
    try {
      await mutate(
        instance,
        'adminStorage.walls.create',
        { fields },
        `wall.create:${JSON.stringify(fields)}`,
        'walls',
      );
      form.reset();
      instance.state.set('createWallOpen', false);
    } catch (_) {
      // mutate displays the error in the wall section.
    }
  },
  async 'submit .edit-wall-form'(event, instance) {
    event.preventDefault();
    const values = formObject(event.currentTarget);
    const wall_id = event.currentTarget.dataset.id;
    const fields = {
      name: values.name,
      floor: values.floor,
      display_order: Number(values.display_order),
      column_count: Number(values.column_count),
      row_count: Number(values.row_count),
      active: values.active === 'on',
      note: values.note || null,
    };
    try {
      await mutate(
        instance,
        'adminStorage.walls.update',
        { wall_id, fields },
        `wall.update:${wall_id}:${JSON.stringify(fields)}`,
        'walls',
      );
    } catch (_) {
      // mutate displays the error in the wall section.
    }
  },
  'click .toggle-create-unit'(event, instance) {
    event.preventDefault();
    instance.state.set('createUnitOpen', !instance.state.get('createUnitOpen'));
  },
  async 'submit .create-unit-form'(event, instance) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = formObject(form);
    fields.column = Number(fields.column);
    fields.row = Number(fields.row);
    if (!fields.note) delete fields.note;
    try {
      await mutate(
        instance,
        'adminStorage.units.create',
        { fields },
        `unit.create:${JSON.stringify(fields)}`,
        'inventory',
      );
      form.reset();
      instance.state.set('createUnitOpen', false);
    } catch (_) {
      // mutate displays the error in the inventory section.
    }
  },
  'input .storage-filter, change .storage-filter'(event, instance) {
    setStateMapValue(
      instance,
      'filters',
      event.currentTarget.dataset.filter,
      event.currentTarget.value,
    );
  },
  'change .storage-owner-filter'(event, instance) {
    setStateMapValue(instance, 'filters', 'owner', event.currentTarget.checked);
  },
  'change .storage-overdue-filter'(event, instance) {
    setStateMapValue(instance, 'filters', 'overdue', event.currentTarget.checked);
  },
  'input .storage-queue-search'(event, instance) {
    instance.state.set('queueQuery', event.currentTarget.value);
  },
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
  'click .open-request-flow'(event, instance) {
    event.preventDefault();
    instance.state.set('requestEditor', { mode: event.currentTarget.dataset.mode });
  },
  'click .close-request-editor'(event, instance) {
    event.preventDefault();
    instance.state.set('requestEditor', null);
  },
  'click .edit-queue-preference, click .correct-queue-date'(event, instance) {
    event.preventDefault();
    instance.state.set('requestEditor', {
      mode: 'edit',
      requestId: event.currentTarget.dataset.id,
      advancedOpen: event.currentTarget.classList.contains('correct-queue-date'),
    });
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
  'click .select-unit'(event, instance) {
    instance.state.set('selectedUnitId', event.currentTarget.dataset.id);
  },
  async 'submit .edit-unit-form'(event, instance) {
    event.preventDefault();
    const values = formObject(event.currentTarget);
    const unit_id = event.currentTarget.dataset.id;
    const fields = {
      name: values.name,
      wall_id: values.wall_id,
      column: Number(values.column),
      row: Number(values.row),
      availability_status: values.availability_status,
      note: values.note || null,
    };
    try {
      await mutate(
        instance,
        'adminStorage.units.update',
        { unit_id, fields, acknowledged: values.acknowledged === 'on' },
        `unit.update:${unit_id}:${JSON.stringify(fields)}`,
        'inventory',
      );
    } catch (_) {
      // mutate displays the error in the inventory section.
    }
  },
  async 'submit .manual-assign-form'(event, instance) {
    event.preventDefault();
    const values = formObject(event.currentTarget);
    const payload = {
      unit_id: event.currentTarget.dataset.id,
      owner_id: values.owner_id,
      override: values.override === 'on',
      reason: values.reason || undefined,
    };
    try {
      await mutate(
        instance,
        'adminStorage.units.assignManual',
        payload,
        `assign:${JSON.stringify(payload)}`,
        'inventory',
      );
    } catch (_) {
      // mutate displays the error in the inventory section.
    }
  },
  async 'click .confirm-clearance'(event, instance) {
    const unit_id = event.currentTarget.dataset.id;
    try {
      await mutate(
        instance,
        'adminStorage.clearances.confirm',
        { unit_id },
        `clear:${unit_id}`,
        'inventory',
      );
    } catch (_) {
      // mutate displays the error in the inventory section.
    }
  },
  async 'click .mark-unit-returned'(event, instance) {
    const unit_id = event.currentTarget.dataset.id;
    const reason = prompt('Reason for marking this unit as returned:');
    if (!reason) return;
    try {
      await mutate(
        instance,
        'adminStorage.units.markReturnedManual',
        { unit_id, reason },
        `return:${unit_id}:${reason}`,
        'inventory',
      );
    } catch (_) {
      // mutate displays the error in the inventory section.
    }
  },
  async 'click .create-exemption'(event, instance) {
    const unit_id = event.currentTarget.dataset.id;
    const reason = prompt('Internal exemption reason:');
    if (!reason) return;
    const until = prompt('Optional end date (YYYY-MM-DD), or blank:') || '';
    const exempt_until = until ? new Date(`${until}T23:59:59`) : undefined;
    try {
      await mutate(
        instance,
        'adminStorage.units.createExemption',
        { unit_id, reason, exempt_until },
        `exempt:${unit_id}:${reason}:${until}`,
        'inventory',
      );
    } catch (_) {
      // mutate displays the error in the inventory section.
    }
  },
  async 'click .revoke-exemption'(event, instance) {
    const unit_id = event.currentTarget.dataset.id;
    try {
      await mutate(
        instance,
        'adminStorage.units.revokeExemption',
        { unit_id },
        `revoke:${unit_id}`,
        'inventory',
      );
    } catch (_) {
      // mutate displays the error in the inventory section.
    }
  },
  async 'click .cancel-request'(event, instance) {
    const request_id = event.currentTarget.dataset.id;
    const reason = prompt('Reason for cancelling this request:');
    if (!reason) return;
    try {
      await mutate(
        instance,
        'adminStorage.requests.cancel',
        { request_id, reason },
        `request.cancel:${request_id}:${reason}`,
        'queue',
      );
    } catch (_) {
      // mutate displays the error in the queue section.
    }
  },
  async 'click .toggle-request-pause'(event, instance) {
    const request_id = event.currentTarget.dataset.id;
    const paused = event.currentTarget.dataset.paused === 'true';
    const reason = prompt(paused ? 'Reason for pausing:' : 'Reason for resuming:');
    if (!reason) return;
    try {
      await mutate(
        instance,
        'adminStorage.requests.setPaused',
        { request_id, paused, reason },
        `request.pause:${request_id}:${paused}:${reason}`,
        'queue',
      );
    } catch (_) {
      // mutate displays the error in the queue section.
    }
  },
  async 'submit .request-goal-form'(event, instance) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = formObject(form);
    if (values.requested_at && !String(values.reason || '').trim()) {
      form.elements.reason.setCustomValidity('A reason is required when correcting the waiting date.');
      form.reportValidity();
      return;
    }
    form.elements.reason.setCustomValidity('');
    const preference = {
      ...(values.floor ? { floor: values.floor } : {}),
      ...(values.height ? { height: values.height } : {}),
    };
    if (values.request_type === 'move' && !Object.keys(preference).length) {
      setError(
        instance,
        'Choose at least one floor or height preference for a different-unit request.',
        'queue',
      );
      return;
    }
    const storageOwnerId = storageOwnerIdForMember(values.owner_id);
    const activeRequest = !values.request_id && activeRequestForOwner(storageOwnerId);
    const assignment = StorageUnits.findOne({ owner: storageOwnerId, availability_status: 'occupied' });
    if (activeRequest) {
      setError(
        instance,
        'This storage owner already has an active request. Use its queue row instead.',
        'queue',
      );
      return;
    }
    if (values.request_type === 'allocation' && assignment) {
      setError(instance, 'This member already has storage. Use “Request different unit”.', 'queue');
      return;
    }
    if (values.request_type === 'move' && !assignment) {
      setError(instance, 'This member has no current storage. Use “Add to queue”.', 'queue');
      return;
    }
    const payload = {
      owner_id: values.owner_id,
      request_id: values.request_id || undefined,
      request_type: values.request_type,
      preference: Object.keys(preference).length ? preference : undefined,
      requested_at: values.requested_at
        ? new Date(`${values.requested_at}T00:00:00`)
        : undefined,
      reason: values.reason || undefined,
    };
    try {
      await mutate(
        instance,
        'adminStorage.requests.upsert',
        payload,
        `request.upsert:${JSON.stringify(payload)}`,
        'queue',
      );
      instance.state.set('requestEditor', null);
    } catch (_) {
      // mutate displays the error in the queue section.
    }
  },
  async 'click .request-release'(event, instance) {
    event.preventDefault();
    const owner_id = event.currentTarget.dataset.owner;
    if (!confirm('Add a release request for this assigned unit? No automatic notification will be sent.')) return;
    const payload = { owner_id, request_type: 'release' };
    try {
      await mutate(
        instance,
        'adminStorage.requests.upsert',
        payload,
        `request.upsert:${JSON.stringify(payload)}`,
        'queue',
      );
    } catch (_) {
      // mutate displays the error in the queue section.
    }
  },
  async 'click .complete-offer'(event, instance) {
    const offer_id = event.currentTarget.dataset.id;
    try {
      await mutate(
        instance,
        'adminStorage.offers.completeManual',
        { offer_id },
        `offer.complete:${offer_id}`,
        'inventory',
      );
    } catch (_) {
      // mutate displays the error in the inventory section.
    }
  },
  async 'click .extend-offer'(event, instance) {
    const offer_id = event.currentTarget.dataset.id;
    const value = prompt('New deadline (YYYY-MM-DD):');
    const reason = value && prompt('Reason:');
    if (!value || !reason) return;
    try {
      await mutate(
        instance,
        'adminStorage.offers.extendManual',
        { offer_id, extend_to: new Date(`${value}T23:59:59`), reason },
        `offer.extend:${offer_id}:${value}:${reason}`,
        'inventory',
      );
    } catch (_) {
      // mutate displays the error in the inventory section.
    }
  },
  async 'click .cancel-offer'(event, instance) {
    const offer_id = event.currentTarget.dataset.id;
    const reason = prompt('Cancellation reason:');
    if (!reason) return;
    const cancel_request = confirm(
      'Also cancel the member request? OK cancels it; Cancel returns it to queue.',
    );
    try {
      await mutate(
        instance,
        'adminStorage.offers.cancelManual',
        { offer_id, reason, cancel_request },
        `offer.cancel:${offer_id}:${reason}:${cancel_request}`,
        'inventory',
      );
    } catch (_) {
      // mutate displays the error in the inventory section.
    }
  },
});
