import crypto from 'node:crypto';
import { Meteor } from 'meteor/meteor';
import { Members } from '/imports/common/collections/members';
import { Messages } from '/imports/common/collections/messages';
import {
  StorageUnits,
  StorageRequests,
  StorageAssignments,
  StorageWarnings,
  StorageExemptions,
  StorageMoves,
} from '/imports/common/collections/storage';
import {
  hasActiveLabMembershipAt,
  isStorageExemptionActive,
  isStorageMoveReviewDue,
  isStorageReclamationEligible,
  isStorageReminderEligible,
  proposeStorageAllocations,
} from '/imports/common/lib/storageRules';
import { reconcileStorageState } from './reconciliation';
import { storageAllocationReadiness } from './readiness';
import { storageMessageRecordId } from '../storageMessages/service';

export const STORAGE_SUGGESTION_ACTIONS = [
  'allocate',
  'warn',
  'remind',
  'reclaim',
  'release',
  'review_expired_moves',
  'confirm_clearance',
];

const iso = (value) => value instanceof Date ? value.toISOString() : value;
const fingerprintValue = (value) => {
  if (Array.isArray(value)) return value.map(fingerprintValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, fingerprintValue(value[key])]));
  }
  return iso(value);
};

export const storageSuggestionId = (action, state) => {
  const encoded = JSON.stringify(fingerprintValue({ action, state }));
  return crypto.createHash('sha256').update(encoded).digest('hex');
};

const version = (record) => record
  ? `${record._id}:${iso(record.updatedAt)}:${iso(record.lab)}:${iso(record.senddate)}`
  : null;
const expectedChannels = (owner) => {
  return {
    email: owner?.email ? 'available' : 'unavailable',
    app: 'best_effort',
  };
};

const row = ({ action, owner, unit, request, assignment, warning, warningDelivery, move, reason, phase }) => {
  const state = {
    owner: version(owner),
    unit: version(unit),
    request: version(request),
    assignment: version(assignment),
    warning: version(warning),
    warningDelivery: version(warningDelivery),
    move: version(move),
  };
  return {
    suggestion_id: storageSuggestionId(action, state),
    action,
    decision_type: action === 'allocate'
      ? (request?.request_type === 'move' ? 'move' : 'assignment')
      : action,
    owner: owner?._id,
    member_name: owner?.name,
    unit: unit?._id,
    unit_name: unit?.name,
    request: request?._id,
    assignment: assignment?._id,
    warning: warning?._id,
    ...(action === 'reclaim' ? {
      warning_delivered: Boolean(warningDelivery),
      manual_contact_required: !warningDelivery,
    } : {}),
    move: move?._id,
    reason_code: reason,
    ...(phase ? { phase } : {}),
    relevant_dates: {
      requested_at: request?.requested_at,
      warned_at: warning?.warned_at,
      deadline_at: warning?.deadline_at || move?.deadline_at,
    },
    expected_channels: expectedChannels(owner),
  };
};

export const loadStorageSuggestionState = async () => {
  const [units, requests, assignments, warnings, exemptions, moves, messages] = await Promise.all([
    StorageUnits.find({}).fetchAsync(),
    StorageRequests.find({}).fetchAsync(),
    StorageAssignments.find({}).fetchAsync(),
    StorageWarnings.find({}).fetchAsync(),
    StorageExemptions.find({ active: true }).fetchAsync(),
    StorageMoves.find({ move_status: 'pending' }).fetchAsync(),
    Messages.find({ type: 'storage' }).fetchAsync(),
  ]);
  const ownerIds = [...new Set([
    ...requests.map((item) => item.owner),
    ...assignments.map((item) => item.owner),
    ...warnings.map((item) => item.owner),
    ...moves.map((item) => item.owner),
    ...messages.map((item) => item.member),
  ])];
  const members = await Members.find({ _id: { $in: ownerIds } }).fetchAsync();
  return { units, requests, assignments, warnings, exemptions, moves, messages, members };
};

export const buildStorageSuggestions = (action, state, now = new Date()) => {
  if (!STORAGE_SUGGESTION_ACTIONS.includes(action)) throw new Error(`Unknown storage action: ${action}`);
  const memberById = new Map(state.members.map((member) => [member._id, member]));
  const unitById = new Map(state.units.map((unit) => [unit._id, unit]));
  const assignmentById = new Map(state.assignments.map((assignment) => [assignment._id, assignment]));
  const activeAssignments = state.assignments.filter((assignment) => !assignment.ended_at);
  const activeAssignmentByOwner = new Map(activeAssignments.map((assignment) => [assignment.owner, assignment]));
  const openWarningByAssignment = new Map(
    state.warnings.filter((warning) => warning.warning_status === 'open')
      .map((warning) => [warning.assignment, warning]),
  );
  const exemptionByAssignment = new Map(
    state.exemptions.filter((exemption) => isStorageExemptionActive(exemption, now))
      .map((exemption) => [exemption.assignment, exemption]),
  );
  const messageById = new Map((state.messages || []).map((message) => [message._id, message]));
  const rows = [];
  const skipped = [];

  if (action === 'allocate') {
    const members = new Map(state.members.map((member) => [member._id, member]));
    const result = proposeStorageAllocations({
      units: state.units,
      requests: state.requests,
      assignments: state.assignments,
      members,
      now,
    });
    for (const proposal of result.proposals) {
      const assignment = activeAssignmentByOwner.get(proposal.request.owner);
      rows.push(row({
        action,
        owner: memberById.get(proposal.request.owner),
        unit: proposal.unit,
        request: proposal.request,
        assignment,
        reason: proposal.reason,
        phase: proposal.phase,
      }));
    }
    for (const item of result.skipped) {
      skipped.push({ request: item.request._id, owner: item.request.owner, reason_code: item.reason });
    }
  } else if (action === 'warn') {
    for (const assignment of activeAssignments) {
      const owner = memberById.get(assignment.owner);
      const unit = unitById.get(assignment.unit);
      if (hasActiveLabMembershipAt(owner, now)) continue;
      if (openWarningByAssignment.has(assignment._id)) continue;
      if (exemptionByAssignment.has(assignment._id)) {
        skipped.push({ assignment: assignment._id, owner: assignment.owner, reason_code: 'active_exemption' });
        continue;
      }
      if (!unit || unit.availability_status !== 'occupied') continue;
      rows.push(row({ action, owner, unit, assignment, reason: 'lab_membership_inactive_unwarned' }));
    }
  } else if (action === 'remind' || action === 'reclaim') {
    for (const warning of state.warnings) {
      const assignment = assignmentById.get(warning.assignment);
      if (!assignment || assignment.ended_at) continue;
      const owner = memberById.get(warning.owner);
      const unit = unitById.get(assignment.unit);
      const exemption = exemptionByAssignment.get(assignment._id);
      const eligible = action === 'remind'
        ? isStorageReminderEligible(warning, {
          now,
          reminderAlreadySent: messageById.has(storageMessageRecordId('reminder', warning._id)),
          labIsActive: hasActiveLabMembershipAt(owner, now),
          exemption,
        })
        : isStorageReclamationEligible(warning, {
          now,
          labIsActive: hasActiveLabMembershipAt(owner, now),
          exemption,
        });
      if (!eligible) continue;
      rows.push(row({
        action,
        owner,
        unit,
        assignment,
        warning,
        warningDelivery: messageById.get(storageMessageRecordId('warning', warning._id)),
        reason: action === 'remind' ? 'warning_age_21_days' : 'warning_deadline_passed',
      }));
    }
  } else if (action === 'release') {
    for (const request of state.requests) {
      if (request.request_type !== 'release' || request.request_status !== 'waiting') continue;
      const assignment = activeAssignmentByOwner.get(request.owner);
      if (!assignment || (request.source_assignment && request.source_assignment !== assignment._id)) continue;
      rows.push(row({
        action,
        owner: memberById.get(request.owner),
        unit: unitById.get(assignment.unit),
        request,
        assignment,
        reason: 'voluntary_release_requested',
      }));
    }
  } else if (action === 'review_expired_moves') {
    for (const move of state.moves) {
      if (!isStorageMoveReviewDue(move, now)) continue;
      rows.push(row({
        action,
        owner: memberById.get(move.owner),
        unit: unitById.get(move.to_unit),
        request: state.requests.find((request) => request._id === move.request),
        assignment: assignmentById.get(move.from_assignment),
        move,
        reason: 'move_deadline_passed',
      }));
    }
  } else if (action === 'confirm_clearance') {
    for (const unit of state.units.filter((item) => item.availability_status === 'awaiting_clearance')) {
      rows.push(row({
        action,
        owner: memberById.get(unit.owner),
        unit,
        reason: 'awaiting_physical_clearance',
      }));
    }
  }
  return { rows, skipped };
};

export const previewStorageSuggestions = async (action, { now = new Date() } = {}) => {
  if (!STORAGE_SUGGESTION_ACTIONS.includes(action)) {
    throw new Meteor.Error('bad-action', 'Unknown storage action');
  }
  await reconcileStorageState({ now });
  const state = await loadStorageSuggestionState();
  if (action === 'allocate') {
    const readiness = await storageAllocationReadiness();
    if (!readiness.allocation_ready) {
      return {
        action,
        generated_at: now,
        rows: [],
        skipped: readiness.allocation_blocked_reasons.map((reason_code) => ({ reason_code })),
        blocked: true,
        readiness,
      };
    }
  }
  const result = buildStorageSuggestions(action, state, now);
  return { action, generated_at: now, ...result };
};
