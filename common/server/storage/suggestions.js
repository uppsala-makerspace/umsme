import crypto from 'node:crypto';
import { Meteor } from 'meteor/meteor';
import { Members } from '/imports/common/collections/members';
import { Messages } from '/imports/common/collections/messages';
import { StorageUnits, StorageRequests, StorageOffers } from '/imports/common/collections/storage';
import {
  hasActiveLabMembershipAt,
  isStorageExemptionActive,
  isStorageOfferReviewDue,
  isStorageReclamationEligible,
  isStorageReminderEligible,
  proposeStorageAllocations,
} from '/imports/common/lib/storageRules';
import { reconcileStorageState } from './reconciliation';
import { storageAllocationReadiness } from './readiness';
import { storageMessageRecordId } from '../storageMessages/service';

export const STORAGE_SUGGESTION_ACTIONS = [
  'allocate', 'warn', 'remind', 'reclaim', 'release', 'review_expired_offers', 'confirm_clearance',
];

const iso = (value) => value instanceof Date ? value.toISOString() : value;
const canonical = (value) => {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
  return iso(value);
};

export const storageSuggestionId = (action, state) => crypto.createHash('sha256')
  .update(JSON.stringify(canonical({ action, state }))).digest('hex');

const version = (record) => record
  ? `${record._id}:${iso(record.updatedAt)}:${iso(record.lab)}:${iso(record.senddate)}`
  : null;

const row = ({ action, owner, unit, sourceUnit, request, offer, reason, phase, warningDelivery }) => {
  const warning = sourceUnit?.warning || unit?.warning;
  const state = {
    owner: version(owner), unit: version(unit), sourceUnit: version(sourceUnit),
    request: version(request), offer: version(offer), warning: canonical(warning),
    warningDelivery: version(warningDelivery),
  };
  return {
    suggestion_id: storageSuggestionId(action, state), action,
    decision_type: action === 'allocate' ? (request?.request_type === 'move' ? 'move' : 'assignment') : action,
    owner: owner?._id, member_name: owner?.name,
    unit: unit?._id, unit_name: unit?.name,
    source_unit: sourceUnit?._id, request: request?._id,
    warning: warning?.id, offer: offer?._id,
    ...(action === 'reclaim' ? {
      warning_delivered: Boolean(warningDelivery), manual_contact_required: !warningDelivery,
    } : {}),
    reason_code: reason, ...(phase ? { phase } : {}),
    relevant_dates: {
      requested_at: request?.requested_at,
      warned_at: warning?.warned_at,
      deadline_at: warning?.deadline_at || offer?.deadline_at,
    },
    expected_channels: {
      email: owner?.email && Meteor.settings.deliverMails ? 'available' : 'unavailable',
      app: 'best_effort',
    },
  };
};

export const loadStorageSuggestionState = async () => {
  const [units, requests, offers, messages] = await Promise.all([
    StorageUnits.find({}).fetchAsync(), StorageRequests.find({}).fetchAsync(),
    StorageOffers.find({}).fetchAsync(), Messages.find({ type: 'storage' }).fetchAsync(),
  ]);
  const ownerIds = [...new Set([
    ...units.map((item) => item.owner), ...requests.map((item) => item.owner),
    ...offers.map((item) => item.owner), ...messages.map((item) => item.member),
  ].filter(Boolean))];
  const members = await Members.find({ _id: { $in: ownerIds } }).fetchAsync();
  return { units, requests, offers, messages, members };
};

export const buildStorageSuggestions = (action, state, now = new Date()) => {
  if (!STORAGE_SUGGESTION_ACTIONS.includes(action)) throw new Error(`Unknown storage action: ${action}`);
  const memberById = new Map(state.members.map((member) => [member._id, member]));
  const unitById = new Map(state.units.map((unit) => [unit._id, unit]));
  const occupiedByOwner = new Map(state.units
    .filter((unit) => unit.availability_status === 'occupied' && unit.owner)
    .map((unit) => [unit.owner, unit]));
  const messageById = new Map((state.messages || []).map((message) => [message._id, message]));
  const rows = [];
  const skipped = [];

  if (action === 'allocate') {
    const result = proposeStorageAllocations({
      units: state.units, requests: state.requests,
      members: new Map(state.members.map((member) => [member._id, member])), now,
    });
    for (const proposal of result.proposals) {
      rows.push(row({
        action, owner: memberById.get(proposal.request.owner), unit: proposal.unit,
        sourceUnit: occupiedByOwner.get(proposal.request.owner), request: proposal.request,
        reason: proposal.reason, phase: proposal.phase,
      }));
    }
    for (const item of result.skipped) {
      skipped.push({ request: item.request._id, owner: item.request.owner, reason_code: item.reason });
    }
  } else if (action === 'warn') {
    for (const unit of occupiedByOwner.values()) {
      const owner = memberById.get(unit.owner);
      if (hasActiveLabMembershipAt(owner, now) || unit.warning) continue;
      if (isStorageExemptionActive(unit.exemption, now)) {
        skipped.push({ unit: unit._id, owner: unit.owner, reason_code: 'active_exemption' });
        continue;
      }
      rows.push(row({ action, owner, unit, reason: 'lab_membership_inactive_unwarned' }));
    }
  } else if (action === 'remind' || action === 'reclaim') {
    for (const unit of occupiedByOwner.values()) {
      if (!unit.warning) continue;
      const owner = memberById.get(unit.owner);
      const eligible = action === 'remind'
        ? isStorageReminderEligible(unit.warning, {
          now, reminderAlreadySent: Boolean(unit.warning.reminded_at),
          labIsActive: hasActiveLabMembershipAt(owner, now), exemption: unit.exemption,
        })
        : isStorageReclamationEligible(unit.warning, {
          now, labIsActive: hasActiveLabMembershipAt(owner, now), exemption: unit.exemption,
        });
      if (!eligible) continue;
      rows.push(row({
        action, owner, unit,
        warningDelivery: messageById.get(storageMessageRecordId('warning', unit.warning.id)),
        reason: action === 'remind' ? 'warning_age_21_days' : 'warning_deadline_passed',
      }));
    }
  } else if (action === 'release') {
    for (const request of state.requests) {
      if (request.request_type !== 'release' || request.request_status !== 'waiting') continue;
      const unit = occupiedByOwner.get(request.owner);
      if (!unit || (request.source_unit && request.source_unit !== unit._id)) continue;
      rows.push(row({ action, owner: memberById.get(request.owner), unit, request, reason: 'voluntary_release_requested' }));
    }
  } else if (action === 'review_expired_offers') {
    for (const offer of state.offers) {
      if (!isStorageOfferReviewDue(offer, now)) continue;
      rows.push(row({
        action, owner: memberById.get(offer.owner), unit: unitById.get(offer.to_unit),
        sourceUnit: unitById.get(offer.from_unit),
        request: state.requests.find((request) => request._id === offer.request), offer,
        reason: 'move_deadline_passed',
      }));
    }
  } else if (action === 'confirm_clearance') {
    for (const unit of state.units.filter((item) => item.availability_status === 'awaiting_clearance')) {
      rows.push(row({ action, owner: memberById.get(unit.owner), unit, reason: 'awaiting_physical_clearance' }));
    }
  }
  return { rows, skipped };
};

export const previewStorageSuggestions = async (action, { now = new Date() } = {}) => {
  if (!STORAGE_SUGGESTION_ACTIONS.includes(action)) throw new Meteor.Error('bad-action', 'Unknown storage action');
  await reconcileStorageState({ now });
  const state = await loadStorageSuggestionState();
  if (action === 'allocate') {
    const readiness = await storageAllocationReadiness();
    if (!readiness.allocation_ready) {
      return {
        action, generated_at: now, rows: [],
        skipped: readiness.allocation_blocked_reasons.map((reason_code) => ({ reason_code })),
        blocked: true, readiness,
      };
    }
  }
  return { action, generated_at: now, ...buildStorageSuggestions(action, state, now) };
};
