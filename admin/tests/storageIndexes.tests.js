import assert from 'assert';
import {
  ensureStorageActionExecutionIdentityIndex,
  retireStorageUnitPositionIndex,
  STORAGE_ACTION_EXECUTION_OBSOLETE_UNIQUE_INDEX,
  STORAGE_ACTION_EXECUTION_SCOPED_UNIQUE_INDEX,
  STORAGE_UNIT_OBSOLETE_POSITION_INDEX,
} from '/imports/common/server/storageIndexes';

const sameSpec = (left, right) => JSON.stringify(left) === JSON.stringify(right);

class FakeRawCollection {
  constructor(indexes = []) {
    this.indexes = indexes.map((index) => ({ ...index, key: { ...index.key } }));
    this.created = [];
    this.dropped = [];
  }

  async createIndex(key, options) {
    this.created.push({ key, options });
    const existing = this.indexes.find((index) => index.name === options.name);
    if (existing) {
      if (!sameSpec(existing.key, key) || existing.unique !== options.unique) {
        throw new Error('index name conflict');
      }
      return options.name;
    }
    this.indexes.push({ name: options.name, key: { ...key }, unique: options.unique });
    return options.name;
  }

  listIndexes() {
    return { toArray: async () => this.indexes.map((index) => ({ ...index, key: { ...index.key } })) };
  }

  async dropIndex(name) {
    this.dropped.push(name);
    this.indexes = this.indexes.filter((index) => index.name !== name);
  }
}

const scoped = {
  name: STORAGE_ACTION_EXECUTION_SCOPED_UNIQUE_INDEX,
  key: { created_by: 1, operation_kind: 1, command_id: 1, suggestion_id: 1 },
  unique: true,
};

describe('storage action execution index rollout', function () {
  it('creates the scoped index on a fresh collection and reruns cleanly', async function () {
    const raw = new FakeRawCollection();
    assert.strictEqual((await ensureStorageActionExecutionIdentityIndex(raw)).dropped_obsolete, false);
    assert.strictEqual((await ensureStorageActionExecutionIdentityIndex(raw)).dropped_obsolete, false);
    assert.strictEqual(raw.indexes.filter((index) => index.name === scoped.name).length, 1);
    assert.deepStrictEqual(raw.dropped, []);
  });

  it('accepts an already-new collection without dropping anything', async function () {
    const raw = new FakeRawCollection([scoped]);
    await ensureStorageActionExecutionIdentityIndex(raw);
    assert.deepStrictEqual(raw.dropped, []);
    assert.strictEqual(raw.indexes.length, 1);
  });

  it('creates the scoped index before dropping the exact obsolete index and reruns cleanly', async function () {
    const raw = new FakeRawCollection([{
      name: STORAGE_ACTION_EXECUTION_OBSOLETE_UNIQUE_INDEX,
      key: { command_id: 1, suggestion_id: 1 },
      unique: true,
    }]);
    assert.strictEqual((await ensureStorageActionExecutionIdentityIndex(raw)).dropped_obsolete, true);
    assert.strictEqual(raw.created[0].options.name, STORAGE_ACTION_EXECUTION_SCOPED_UNIQUE_INDEX);
    assert.deepStrictEqual(raw.dropped, [STORAGE_ACTION_EXECUTION_OBSOLETE_UNIQUE_INDEX]);
    assert.strictEqual((await ensureStorageActionExecutionIdentityIndex(raw)).dropped_obsolete, false);
  });

  it('preserves and rejects a same-named index whose shape is not the known obsolete spec', async function () {
    const raw = new FakeRawCollection([{
      name: STORAGE_ACTION_EXECUTION_OBSOLETE_UNIQUE_INDEX,
      key: { command_id: 1, created_by: 1 },
      unique: true,
    }]);
    await assert.rejects(
      ensureStorageActionExecutionIdentityIndex(raw),
      /Refusing to drop unexpected index storage_action_execution_row_unique/,
    );
    assert.deepStrictEqual(raw.dropped, []);
    assert(raw.indexes.some((index) => index.name === STORAGE_ACTION_EXECUTION_OBSOLETE_UNIQUE_INDEX));
  });
});

describe('storage unit coordinate index rollout', function () {
  it('drops only the exact obsolete wall-position index', async function () {
    const raw = new FakeRawCollection([{
      name: STORAGE_UNIT_OBSOLETE_POSITION_INDEX,
      key: { wall: 1, position: 1 },
      unique: true,
    }]);
    await retireStorageUnitPositionIndex(raw);
    await retireStorageUnitPositionIndex(raw);
    assert.deepStrictEqual(raw.dropped, [STORAGE_UNIT_OBSOLETE_POSITION_INDEX]);
  });

  it('preserves and rejects an unexpected same-named index', async function () {
    const raw = new FakeRawCollection([{
      name: STORAGE_UNIT_OBSOLETE_POSITION_INDEX,
      key: { wall: 1 },
      unique: true,
    }]);
    await assert.rejects(
      retireStorageUnitPositionIndex(raw),
      /Refusing to drop unexpected index storage_unit_wall_position_unique/,
    );
    assert.deepStrictEqual(raw.dropped, []);
  });
});
