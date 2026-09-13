import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { requireStorageOperator } from '/imports/common/server/storage/access';
import { previewStorageSuggestions } from '/imports/common/server/storage/suggestions';
import { confirmStorageSuggestions } from '/imports/common/server/storage/commands';
import {
  assignStorageUnitManual,
  bulkSetStorageHeightManual,
  cancelStorageMoveManual,
  cancelStorageRequestManual,
  completeStorageMoveManual,
  confirmStorageClearanceManual,
  createStorageExemptionManual,
  createStorageWallManual,
  createStorageUnitManual,
  endStorageAssignmentManual,
  extendStorageMoveManual,
  revokeStorageExemptionManual,
  setStorageRequestPausedManual,
  updateStorageUnitManual,
  updateStorageWallManual,
  upsertStorageRequestManual,
} from '/imports/common/server/storage/manual';

const operator = async (context) => {
  await requireStorageOperator(context.userId);
  return context.userId;
};

Meteor.methods({
  async 'adminStorage.walls.create'({ fields, command_id }) {
    check(fields, Object);
    check(command_id, String);
    return createStorageWallManual({ fields, commandId: command_id, actor: await operator(this) });
  },

  async 'adminStorage.walls.update'({ wall_id, fields, command_id }) {
    check(wall_id, String);
    check(fields, Object);
    check(command_id, String);
    return updateStorageWallManual({ wallId: wall_id, fields, commandId: command_id, actor: await operator(this) });
  },

  async 'adminStorage.preview'({ action }) {
    check(action, String);
    await operator(this);
    return previewStorageSuggestions(action);
  },

  async 'adminStorage.confirm'({ action, command_id, selections }) {
    check(action, String);
    check(command_id, String);
    check(selections, [Object]);
    const actor = await operator(this);
    return confirmStorageSuggestions({ action, commandId: command_id, selections, actor });
  },

  async 'adminStorage.units.create'({ fields, command_id }) {
    check(fields, Object);
    check(command_id, String);
    return createStorageUnitManual({ fields, commandId: command_id, actor: await operator(this) });
  },

  async 'adminStorage.units.update'({ unit_id, fields, acknowledged, command_id }) {
    check(unit_id, String);
    check(fields, Object);
    check(acknowledged, Match.Maybe(Boolean));
    check(command_id, String);
    return updateStorageUnitManual({ unitId: unit_id, fields, acknowledged, commandId: command_id, actor: await operator(this) });
  },

  async 'adminStorage.units.bulkSetHeight'({ unit_ids, height, acknowledged, command_id }) {
    check(unit_ids, [String]);
    check(height, String);
    check(acknowledged, Match.Maybe(Boolean));
    check(command_id, String);
    return bulkSetStorageHeightManual({ unitIds: unit_ids, height, acknowledged, commandId: command_id, actor: await operator(this) });
  },

  async 'adminStorage.assignments.assignManual'({ unit_id, owner_id, override, reason, command_id }) {
    check(unit_id, String);
    check(owner_id, String);
    check(override, Match.Maybe(Boolean));
    check(reason, Match.Maybe(String));
    check(command_id, String);
    return assignStorageUnitManual({ unitId: unit_id, ownerId: owner_id, override, reason, commandId: command_id, actor: await operator(this) });
  },

  async 'adminStorage.assignments.endManual'({ assignment_id, reason, command_id }) {
    check(assignment_id, String);
    check(reason, String);
    check(command_id, String);
    return endStorageAssignmentManual({ assignmentId: assignment_id, reason, commandId: command_id, actor: await operator(this) });
  },

  async 'adminStorage.assignments.correct'({ assignment_id, reason, command_id }) {
    check(assignment_id, String);
    check(reason, String);
    check(command_id, String);
    return endStorageAssignmentManual({ assignmentId: assignment_id, reason, commandId: command_id, actor: await operator(this) });
  },

  async 'adminStorage.requests.upsert'({ owner_id, request_id, request_type, preference, requested_at, reason, command_id }) {
    check(owner_id, String);
    check(request_id, Match.Maybe(String));
    check(request_type, String);
    check(preference, Match.Maybe(Object));
    check(requested_at, Match.Maybe(Date));
    check(reason, Match.Maybe(String));
    check(command_id, String);
    return upsertStorageRequestManual({
      ownerId: owner_id, requestId: request_id, requestType: request_type,
      preference, requestedAt: requested_at, reason, commandId: command_id, actor: await operator(this),
    });
  },

  async 'adminStorage.requests.cancel'({ request_id, reason, command_id }) {
    check(request_id, String);
    check(reason, String);
    check(command_id, String);
    return cancelStorageRequestManual({ requestId: request_id, reason, commandId: command_id, actor: await operator(this) });
  },

  async 'adminStorage.requests.setPaused'({ request_id, paused, reason, command_id }) {
    check(request_id, String);
    check(paused, Boolean);
    check(reason, String);
    check(command_id, String);
    return setStorageRequestPausedManual({
      requestId: request_id, paused, reason, commandId: command_id, actor: await operator(this),
    });
  },

  async 'adminStorage.exemptions.create'({ assignment_id, reason, exempt_until, command_id }) {
    check(assignment_id, String);
    check(reason, String);
    check(exempt_until, Match.Maybe(Date));
    check(command_id, String);
    return createStorageExemptionManual({ assignmentId: assignment_id, reason, exemptUntil: exempt_until, commandId: command_id, actor: await operator(this) });
  },

  async 'adminStorage.exemptions.revoke'({ exemption_id, command_id }) {
    check(exemption_id, String);
    check(command_id, String);
    return revokeStorageExemptionManual({ exemptionId: exemption_id, commandId: command_id, actor: await operator(this) });
  },

  async 'adminStorage.moves.completeManual'({ move_id }) {
    check(move_id, String);
    return completeStorageMoveManual({ moveId: move_id, actor: await operator(this) });
  },

  async 'adminStorage.moves.extendManual'({ move_id, extend_to, reason, command_id }) {
    check(move_id, String);
    check(extend_to, Date);
    check(reason, String);
    check(command_id, String);
    return extendStorageMoveManual({ moveId: move_id, extendTo: extend_to, reason, commandId: command_id, actor: await operator(this) });
  },

  async 'adminStorage.moves.cancelManual'({ move_id, reason, cancel_request, command_id }) {
    check(move_id, String);
    check(reason, String);
    check(cancel_request, Match.Maybe(Boolean));
    check(command_id, String);
    return cancelStorageMoveManual({
      moveId: move_id, reason, cancelRequest: cancel_request, commandId: command_id, actor: await operator(this),
    });
  },

  async 'adminStorage.clearances.confirm'({ unit_id, command_id }) {
    check(unit_id, String);
    check(command_id, String);
    return confirmStorageClearanceManual({ unitId: unit_id, commandId: command_id, actor: await operator(this) });
  },

});
