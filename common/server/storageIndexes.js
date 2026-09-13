import {
  StorageWalls, StorageUnits, StorageRequests, StorageOffers, StorageEvents,
} from '/imports/common/collections/storage';

const create = (collection, keys, options = {}) => collection.rawCollection().createIndex(keys, options);

export const STORAGE_UNIT_OBSOLETE_POSITION_INDEX = 'storage_unit_wall_position_unique';

const exactIndexKeys = (actual, expected) => {
  const actualEntries = Object.entries(actual || {});
  const expectedEntries = Object.entries(expected);
  return actualEntries.length === expectedEntries.length && actualEntries.every(
    ([field, direction], index) => field === expectedEntries[index][0] && direction === expectedEntries[index][1],
  );
};

export const retireStorageUnitPositionIndex = async (rawCollection) => {
  const indexes = await rawCollection.listIndexes().toArray();
  const obsolete = indexes.find(({ name }) => name === STORAGE_UNIT_OBSOLETE_POSITION_INDEX);
  if (!obsolete) return;
  if (obsolete.unique === true && exactIndexKeys(obsolete.key, { wall: 1, position: 1 })) {
    await rawCollection.dropIndex(STORAGE_UNIT_OBSOLETE_POSITION_INDEX);
    return;
  }
  throw new Error(`Refusing to drop unexpected index ${STORAGE_UNIT_OBSOLETE_POSITION_INDEX}`);
};

export const ensureStorageIndexes = async () => {
  await create(StorageWalls, { name: 1 }, { unique: true, name: 'storage_wall_name_unique' });
  await create(StorageWalls, { display_order: 1, name: 1 }, { name: 'storage_wall_display_order' });

  await create(StorageUnits, { name: 1 }, { unique: true, name: 'storage_unit_name_unique' });
  await retireStorageUnitPositionIndex(StorageUnits.rawCollection());
  await create(StorageUnits, { wall_id: 1, column: 1, row: 1 }, {
    unique: true, name: 'storage_unit_wall_coordinate_unique',
  });
  await create(StorageUnits, { availability_status: 1, floor: 1, height: 1, name: 1 }, {
    name: 'storage_unit_allocation_candidates',
  });
  await create(StorageUnits, { owner: 1, availability_status: 1 }, { name: 'storage_unit_owner' });
  await create(StorageUnits, { owner: 1 }, {
    unique: true,
    name: 'storage_unit_one_occupied_per_owner',
    partialFilterExpression: { availability_status: 'occupied' },
  });
  await create(StorageUnits, { 'warning.deadline_at': 1 }, { name: 'storage_unit_warning_deadline' });
  await create(StorageUnits, { 'exemption.exempt_until': 1 }, { name: 'storage_unit_exemption_expiry' });

  await create(StorageRequests, { owner: 1 }, {
    unique: true,
    name: 'storage_request_one_active_per_owner',
    partialFilterExpression: { request_status: { $in: ['waiting', 'paused_ineligible', 'in_progress'] } },
  });
  await create(StorageRequests, { request_status: 1, request_type: 1, requested_at: 1, _id: 1 }, {
    name: 'storage_request_queue',
  });
  await create(StorageRequests, { source_unit: 1 }, { name: 'storage_request_source_unit' });

  for (const field of ['owner', 'request', 'to_unit']) {
    await create(StorageOffers, { [field]: 1 }, { unique: true, name: `storage_offer_one_pending_per_${field}` });
  }
  await create(StorageOffers, { deadline_at: 1 }, { name: 'storage_offer_deadlines' });

  await create(StorageEvents, { entity_type: 1, entity_id: 1, occurred_at: -1 }, { name: 'storage_event_entity_history' });
  await create(StorageEvents, { member: 1, occurred_at: -1 }, { name: 'storage_event_member_history' });
  await create(StorageEvents, { unit: 1, occurred_at: -1 }, { name: 'storage_event_unit_history' });
  await create(StorageEvents, { event_type: 1, occurred_at: -1 }, { name: 'storage_event_type_history' });
  await create(StorageEvents, { actor: 1, occurred_at: -1 }, { name: 'storage_event_actor_history' });
};
