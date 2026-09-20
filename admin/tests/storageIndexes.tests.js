import assert from 'assert';
import {
  retireStorageUnitPositionIndex, STORAGE_UNIT_OBSOLETE_POSITION_INDEX,
} from '/imports/common/server/storageIndexes';

class FakeRawCollection {
  constructor(indexes = []) {
    this.indexes = indexes;
    this.dropped = [];
  }

  listIndexes() {
    return { toArray: async () => this.indexes };
  }

  async dropIndex(name) {
    this.dropped.push(name);
    this.indexes = this.indexes.filter((index) => index.name !== name);
  }
}

describe('storage unit coordinate index rollout', function () {
  it('drops only the exact obsolete wall-position index', async function () {
    const raw = new FakeRawCollection([{
      name: STORAGE_UNIT_OBSOLETE_POSITION_INDEX,
      key: { wall: 1, position: 1 }, unique: true,
    }]);
    await retireStorageUnitPositionIndex(raw);
    await retireStorageUnitPositionIndex(raw);
    assert.deepStrictEqual(raw.dropped, [STORAGE_UNIT_OBSOLETE_POSITION_INDEX]);
  });

  it('preserves and rejects an unexpected same-named index', async function () {
    const raw = new FakeRawCollection([{
      name: STORAGE_UNIT_OBSOLETE_POSITION_INDEX, key: { wall: 1 }, unique: true,
    }]);
    await assert.rejects(retireStorageUnitPositionIndex(raw), /Refusing to drop unexpected index/);
    assert.deepStrictEqual(raw.dropped, []);
  });
});
