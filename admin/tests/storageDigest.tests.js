import assert from 'assert';
import { createHash } from 'node:crypto';
import { storageDigest } from '/imports/common/lib/storageDigest';
import { storageOperationId } from '/imports/common/server/storage/ids';
import { storageSuggestionId } from '/imports/common/server/storage/suggestions';

describe('storage digests', function () {
  it('normalizes nested dates and object order while preserving array order', function () {
    const date = new Date('2026-09-15T00:00:00Z');
    assert.strictEqual(storageDigest({ b: [date], a: 1 }),
      storageDigest({ a: 1, b: [date.toISOString()] }));
    assert.notStrictEqual(storageDigest([1, 2]), storageDigest([2, 1]));
    assert.notStrictEqual(storageSuggestionId('warn', { deadline: date }),
      storageSuggestionId('warn', { deadline: new Date(date.getTime() + 1) }));
  });

  it('preserves existing command receipt identifiers', function () {
    assert.strictEqual(storageOperationId('manual', 'return', 'user', 'command'),
      createHash('sha256').update('manual:return:user:command').digest('hex').slice(0, 32));
  });
});
