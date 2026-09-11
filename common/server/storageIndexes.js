import {
  StorageWalls,
  StorageUnits,
  StorageRequests,
  StorageAssignments,
  StorageWarnings,
  StorageExemptions,
  StorageMoves,
  StorageNotificationDeliveries,
  StorageEvents,
  StorageActionExecutions,
} from '/imports/common/collections/storage';

const create = (collection, keys, options = {}) =>
  collection.rawCollection().createIndex(keys, options);

export const STORAGE_ACTION_EXECUTION_SCOPED_UNIQUE_INDEX =
  'storage_action_execution_actor_kind_row_unique';
export const STORAGE_ACTION_EXECUTION_OBSOLETE_UNIQUE_INDEX =
  'storage_action_execution_row_unique';
export const STORAGE_UNIT_OBSOLETE_POSITION_INDEX = 'storage_unit_wall_position_unique';
const scopedExecutionKeys = {
  created_by: 1, operation_kind: 1, command_id: 1, suggestion_id: 1,
};
const obsoleteExecutionKeys = { command_id: 1, suggestion_id: 1 };

const exactIndexKeys = (actual, expected) => {
  const actualEntries = Object.entries(actual || {});
  const expectedEntries = Object.entries(expected);
  return actualEntries.length === expectedEntries.length &&
    actualEntries.every(([field, direction], index) =>
      field === expectedEntries[index][0] && direction === expectedEntries[index][1]);
};

/**
 * Add the actor/kind-scoped identity constraint before retiring the old,
 * over-broad command/suggestion constraint. A reused legacy name with any
 * other shape is deliberately left untouched for an operator to investigate.
 */
export const ensureStorageActionExecutionIdentityIndex = async (rawCollection) => {
  await rawCollection.createIndex(scopedExecutionKeys, {
    unique: true,
    name: STORAGE_ACTION_EXECUTION_SCOPED_UNIQUE_INDEX,
  });
  const indexes = await rawCollection.listIndexes().toArray();
  const obsolete = indexes.find(({ name }) => name === STORAGE_ACTION_EXECUTION_OBSOLETE_UNIQUE_INDEX);
  if (obsolete && obsolete.unique === true && exactIndexKeys(obsolete.key, obsoleteExecutionKeys)) {
    await rawCollection.dropIndex(STORAGE_ACTION_EXECUTION_OBSOLETE_UNIQUE_INDEX);
    return { created: STORAGE_ACTION_EXECUTION_SCOPED_UNIQUE_INDEX, dropped_obsolete: true };
  }
  if (obsolete) {
    throw new Error(
      `Refusing to drop unexpected index ${STORAGE_ACTION_EXECUTION_OBSOLETE_UNIQUE_INDEX}; ` +
      'expected unique {command_id: 1, suggestion_id: 1}. Inspect and resolve it manually.',
    );
  }
  return { created: STORAGE_ACTION_EXECUTION_SCOPED_UNIQUE_INDEX, dropped_obsolete: false };
};

export const retireStorageUnitPositionIndex = async (rawCollection) => {
  const indexes = await rawCollection.listIndexes().toArray();
  const obsolete = indexes.find(({ name }) => name === STORAGE_UNIT_OBSOLETE_POSITION_INDEX);
  if (!obsolete) return;
  if (obsolete.unique === true && exactIndexKeys(obsolete.key, { wall: 1, position: 1 })) {
    await rawCollection.dropIndex(STORAGE_UNIT_OBSOLETE_POSITION_INDEX);
    return;
  }
  throw new Error(
    `Refusing to drop unexpected index ${STORAGE_UNIT_OBSOLETE_POSITION_INDEX}; ` +
    'expected unique {wall: 1, position: 1}. Inspect and resolve it manually.',
  );
};

/**
 * Create the constraints the storage service relies on before it accepts work.
 * Kept explicit and awaited so an index failure cannot leave the service
 * silently running without its concurrency guarantees.
 */
export const ensureStorageIndexes = async () => {
  await create(StorageWalls, { name: 1 }, { unique: true, name: 'storage_wall_name_unique' });
  await create(StorageWalls, { display_order: 1, name: 1 }, { name: 'storage_wall_display_order' });
  await create(StorageUnits, { name: 1 }, { unique: true, name: 'storage_unit_name_unique' });
  await retireStorageUnitPositionIndex(StorageUnits.rawCollection());
  await create(
    StorageUnits,
    { wall_id: 1, column: 1, row: 1 },
    { unique: true, name: 'storage_unit_wall_coordinate_unique' },
  );
  await create(
    StorageUnits,
    { availability_status: 1, floor: 1, height: 1, name: 1 },
    { name: 'storage_unit_allocation_candidates' },
  );
  await create(StorageUnits, { owner: 1, availability_status: 1 }, { name: 'storage_unit_owner' });

  await create(
    StorageRequests,
    { owner: 1 },
    {
      unique: true,
      name: 'storage_request_one_active_per_owner',
      partialFilterExpression: {
        request_status: { $in: ['waiting', 'paused_ineligible', 'in_progress'] },
      },
    },
  );
  await create(
    StorageRequests,
    { request_status: 1, request_type: 1, requested_at: 1, _id: 1 },
    { name: 'storage_request_queue' },
  );
  await create(StorageRequests, { source_assignment: 1 }, { name: 'storage_request_source_assignment' });

  // MongoDB does not support `$exists: false` in a partial index expression.
  // Equality with null includes documents where the optional field is absent,
  // while assignments with a Date in ended_at fall outside the index.
  const activeAssignment = { ended_at: null };
  await create(
    StorageAssignments,
    { unit: 1 },
    { unique: true, name: 'storage_assignment_one_active_per_unit', partialFilterExpression: activeAssignment },
  );
  await create(
    StorageAssignments,
    { owner: 1 },
    { unique: true, name: 'storage_assignment_one_active_per_owner', partialFilterExpression: activeAssignment },
  );
  await create(StorageAssignments, { owner: 1, assigned_at: -1 }, { name: 'storage_assignment_owner_history' });
  await create(StorageAssignments, { unit: 1, assigned_at: -1 }, { name: 'storage_assignment_unit_history' });

  await create(
    StorageWarnings,
    { assignment: 1 },
    {
      unique: true,
      name: 'storage_warning_one_open_per_assignment',
      partialFilterExpression: { warning_status: 'open' },
    },
  );
  await create(StorageWarnings, { warning_status: 1, deadline_at: 1 }, { name: 'storage_warning_deadlines' });
  await create(StorageWarnings, { owner: 1, warned_at: -1 }, { name: 'storage_warning_owner_history' });

  await create(
    StorageExemptions,
    { assignment: 1 },
    {
      unique: true,
      name: 'storage_exemption_one_active_per_assignment',
      partialFilterExpression: { active: true },
    },
  );
  await create(StorageExemptions, { exempt_until: 1 }, { name: 'storage_exemption_expiry' });

  for (const field of ['owner', 'request', 'to_unit']) {
    await create(
      StorageMoves,
      { [field]: 1 },
      {
        unique: true,
        name: `storage_move_one_pending_per_${field}`,
        partialFilterExpression: { move_status: 'pending' },
      },
    );
  }
  await create(StorageMoves, { move_status: 1, deadline_at: 1 }, { name: 'storage_move_deadlines' });

  await create(
    StorageNotificationDeliveries,
    { decision_type: 1, decision_id: 1 },
    { unique: true, name: 'storage_delivery_one_per_decision' },
  );
  await create(
    StorageNotificationDeliveries,
    { 'email.status': 1, 'email.lease_expires_at': 1 },
    { name: 'storage_delivery_email_work' },
  );
  await create(
    StorageNotificationDeliveries,
    { 'sms.status': 1, 'sms.lease_expires_at': 1 },
    { name: 'storage_delivery_sms_work' },
  );
  await create(StorageNotificationDeliveries, { owner: 1, created_at: -1 }, { name: 'storage_delivery_owner_history' });

  await create(StorageEvents, { entity_type: 1, entity_id: 1, occurred_at: -1 }, { name: 'storage_event_entity_history' });
  await create(StorageEvents, { event_type: 1, occurred_at: -1 }, { name: 'storage_event_type_history' });
  await create(StorageEvents, { actor: 1, occurred_at: -1 }, { name: 'storage_event_actor_history' });

  await ensureStorageActionExecutionIdentityIndex(StorageActionExecutions.rawCollection());
  await create(
    StorageActionExecutions,
    { execution_status: 1, lease_expires_at: 1 },
    { name: 'storage_action_execution_work' },
  );
  await create(
    StorageActionExecutions,
    { action_type: 1, execution_status: 1, lease_expires_at: 1 },
    { name: 'storage_action_execution_kind_work' },
  );
  await create(StorageActionExecutions, { command_id: 1 }, { name: 'storage_action_execution_command' });
};
