import assert from 'assert';
import {
  buildDirectory,
  PUBLIC_WORKSHOP_STATUSES,
  PUBLIC_GROUP_TYPES,
} from '/imports/common/lib/publicDirectory';

const WORKSHOPS = [
  {
    _id: 'w1',
    name: { sv: 'Textilverkstad', en: 'Textile workshop' },
    tag: { sv: 'Textil', en: 'Textile' },
    description: { sv: 'Symaskin och overlock.', en: 'A sewing machine.' },
    status: 'established',
    primarySpaceId: 's1',
    imageFileId: 'img-w1',
  },
  { _id: 'w2', name: { sv: 'Keramikverkstad' }, status: 'trial' },
  { _id: 'w3', name: { sv: 'Glasverkstad' }, status: 'forming' },
  { _id: 'w4', name: { sv: 'Mörkrumsverkstad' }, status: 'decommissioned' },
];

const GROUPS = [
  { _id: 'g1', name: { sv: 'Modelljärnvägsgruppen' }, type: 'interest', imageFileId: 'img-g1' },
  { _id: 'g2', name: { sv: 'IT-gruppen' }, type: 'function' },
  { _id: 'g3', name: { sv: 'Trägruppen' }, type: 'steering' },
  { _id: 'g4', name: { sv: 'Ugnsgruppen' }, type: 'responsibility' },
];

// Stand-ins for the real URL builders, so the shape can be checked without
// Meteor: absolute, and null when the entity has nothing to serve.
const iconUrlFor = (spaceId) => `https://umsme.example/api/spaces/${spaceId}/icon?v=ico`;
const imageUrlFor = ({ doc, kind }) =>
  doc.imageFileId
    ? `https://umsme.example/api/${kind}s/${doc._id}/image?v=${doc.imageFileId}`
    : null;

const build = (over = {}) =>
  buildDirectory({ workshops: WORKSHOPS, groups: GROUPS, iconUrlFor, imageUrlFor, ...over });

const byId = (entries, id) => entries.find((e) => e.id === id);

describe('publicDirectory', function () {
  describe('selection', function () {
    it('publishes only established and trial workshops', function () {
      assert.deepStrictEqual(PUBLIC_WORKSHOP_STATUSES, ['established', 'trial']);
      const kinds = build().filter((e) => e.kind === 'workshop').map((e) => e.id);
      assert.deepStrictEqual(kinds, ['textilverkstad', 'keramikverkstad']);
    });

    it('publishes only interest and function groups', function () {
      assert.deepStrictEqual(PUBLIC_GROUP_TYPES, ['interest', 'function']);
      const ids = build().filter((e) => e.kind === 'group').map((e) => e.id);
      assert.deepStrictEqual(ids, ['modelljarnvagsgruppen', 'it-gruppen']);
    });

    it('leaves out forming, decommissioned, steering and responsibility', function () {
      const ids = build().map((e) => e.id);
      for (const gone of ['glasverkstad', 'morkrumsverkstad', 'tragruppen', 'ugnsgruppen']) {
        assert.ok(!ids.includes(gone), gone);
      }
    });

    it('returns an empty array for empty input', function () {
      assert.deepStrictEqual(buildDirectory({ iconUrlFor, imageUrlFor }), []);
    });
  });

  describe('shape', function () {
    it('gives a workshop a status and no type', function () {
      const entry = byId(build(), 'textilverkstad');
      assert.strictEqual(entry.kind, 'workshop');
      assert.strictEqual(entry.status, 'established');
      assert.ok(!('type' in entry));
    });

    it('gives a group a type and no status', function () {
      const entry = byId(build(), 'it-gruppen');
      assert.strictEqual(entry.kind, 'group');
      assert.strictEqual(entry.type, 'function');
      assert.ok(!('status' in entry));
    });

    it('carries both languages of name, tag and text', function () {
      const entry = byId(build(), 'textilverkstad');
      assert.deepStrictEqual(entry.name, { sv: 'Textilverkstad', en: 'Textile workshop' });
      assert.deepStrictEqual(entry.tag, { sv: 'Textil', en: 'Textile' });
      assert.deepStrictEqual(entry.text, {
        sv: 'Symaskin och overlock.',
        en: 'A sewing machine.',
      });
    });

    it('keeps a Swedish-only field without an en key', function () {
      assert.deepStrictEqual(byId(build(), 'keramikverkstad').name, { sv: 'Keramikverkstad' });
    });

    it('omits keys with nothing to say rather than sending null', function () {
      const entry = byId(build(), 'keramikverkstad');
      for (const key of ['tag', 'text', 'image', 'icon']) {
        assert.ok(!(key in entry), key);
      }
    });

    it('uses absolute urls for image and icon', function () {
      const entry = byId(build(), 'textilverkstad');
      assert.strictEqual(
        entry.image,
        'https://umsme.example/api/workshops/w1/image?v=img-w1'
      );
      assert.strictEqual(
        entry.icon,
        'https://umsme.example/api/spaces/s1/icon?v=ico'
      );
    });

    it('builds the group image url from the group route', function () {
      assert.strictEqual(
        byId(build(), 'modelljarnvagsgruppen').image,
        'https://umsme.example/api/groups/g1/image?v=img-g1'
      );
    });
  });

  describe('ids', function () {
    it('keeps slugs unique across workshops and groups together', function () {
      const entries = buildDirectory({
        workshops: [{ _id: 'w9', name: { sv: 'Textil' }, status: 'trial' }],
        groups: [{ _id: 'g9', name: { sv: 'Textil' }, type: 'interest' }],
        iconUrlFor,
        imageUrlFor,
      });
      assert.deepStrictEqual(entries.map((e) => e.id).sort(), ['textil', 'textil-2']);
    });
  });
});
