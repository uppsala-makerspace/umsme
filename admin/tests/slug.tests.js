import assert from 'assert';
import { slugify, withUniqueSlugs } from '/imports/common/lib/slug';

describe('slug', function () {
  describe('slugify', function () {
    it('lowercases and keeps a plain name intact', function () {
      assert.strictEqual(slugify('Textilverkstad'), 'textilverkstad');
    });

    it('transliterates the Swedish letters', function () {
      assert.strictEqual(slugify('Träverkstad'), 'traverkstad');
      assert.strictEqual(slugify('Mörkrumsverkstad'), 'morkrumsverkstad');
      assert.strictEqual(slugify('Ångverkstaden'), 'angverkstaden');
    });

    it('transliterates other accents', function () {
      assert.strictEqual(slugify('Café Crème'), 'cafe-creme');
      assert.strictEqual(slugify('Køkken'), 'kokken');
      assert.strictEqual(slugify('Straße'), 'strasse');
    });

    it('drops invisible typographic hints instead of separating on them', function () {
      // A soft hyphen only marks where the word may be broken; the real
      // "Bokbindar­verkstaden" in the database slugged as two words before.
      assert.strictEqual(slugify('Bokbindar­verkstaden'), 'bokbindarverkstaden');
      assert.strictEqual(slugify('Trä​verkstad'), 'traverkstad');
    });

    it('turns runs of punctuation and spaces into single separators', function () {
      assert.strictEqual(slugify('Trä & Metall'), 'tra-metall');
      assert.strictEqual(slugify('3D-skrivare  /  laser'), '3d-skrivare-laser');
    });

    it('trims separators from the ends', function () {
      assert.strictEqual(slugify('  Textil!  '), 'textil');
      assert.strictEqual(slugify('--textil--'), 'textil');
    });

    it('keeps digits', function () {
      assert.strictEqual(slugify('Verkstad 2'), 'verkstad-2');
    });

    it('returns an empty string when nothing usable is left', function () {
      assert.strictEqual(slugify(''), '');
      assert.strictEqual(slugify('!!!'), '');
      assert.strictEqual(slugify(null), '');
      assert.strictEqual(slugify(undefined), '');
    });
  });

  describe('withUniqueSlugs', function () {
    const slugOf = (result, id) => result.find((r) => r._id === id).slug;

    it('leaves distinct names alone', function () {
      const result = withUniqueSlugs([
        { _id: 'a', source: 'Träverkstad' },
        { _id: 'b', source: 'Textilverkstad' },
      ]);
      assert.strictEqual(slugOf(result, 'a'), 'traverkstad');
      assert.strictEqual(slugOf(result, 'b'), 'textilverkstad');
    });

    it('numbers collisions from the second one on', function () {
      const result = withUniqueSlugs([
        { _id: 'a', source: 'Textil' },
        { _id: 'b', source: 'Textil' },
        { _id: 'c', source: 'Textil' },
      ]);
      assert.deepStrictEqual(
        ['a', 'b', 'c'].map((id) => slugOf(result, id)),
        ['textil', 'textil-2', 'textil-3']
      );
    });

    it('assigns the same slugs whatever order the items arrive in', function () {
      const items = [
        { _id: 'b', source: 'Textil' },
        { _id: 'c', source: 'Textil' },
        { _id: 'a', source: 'Textil' },
      ];
      const forward = withUniqueSlugs(items);
      const reversed = withUniqueSlugs([...items].reverse());
      for (const id of ['a', 'b', 'c']) {
        assert.strictEqual(slugOf(forward, id), slugOf(reversed, id), id);
      }
      // The lowest _id keeps the bare slug, so an hourly caller sees stable ids.
      assert.strictEqual(slugOf(forward, 'a'), 'textil');
    });

    it('returns the results in the given order, not the sorted one', function () {
      const result = withUniqueSlugs([
        { _id: 'z', source: 'Sist' },
        { _id: 'a', source: 'Först' },
      ]);
      assert.deepStrictEqual(result.map((r) => r._id), ['z', 'a']);
    });

    it('falls back to the id when the name yields nothing', function () {
      const result = withUniqueSlugs([{ _id: 'abc123', source: '!!!' }]);
      assert.strictEqual(slugOf(result, 'abc123'), 'abc123');
    });

    it('treats names that differ only in accents as a collision', function () {
      const result = withUniqueSlugs([
        { _id: 'a', source: 'Tra' },
        { _id: 'b', source: 'Trä' },
      ]);
      assert.strictEqual(slugOf(result, 'a'), 'tra');
      assert.strictEqual(slugOf(result, 'b'), 'tra-2');
    });
  });
});
