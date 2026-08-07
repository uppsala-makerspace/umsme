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
    secondarySpaceIds: ['s2', 's3'],
    imageFileId: 'img-w1',
  },
  { _id: 'w2', name: { sv: 'Keramikverkstad' }, status: 'trial' },
  // Its space must end up with no reference at all, since a forming workshop
  // is not in `entries` to point at.
  { _id: 'w3', name: { sv: 'Glasverkstad' }, status: 'forming', primarySpaceId: 's5' },
  { _id: 'w4', name: { sv: 'Mörkrumsverkstad' }, status: 'decommissioned' },
];

const GROUPS = [
  {
    _id: 'g1',
    name: { sv: 'Modelljärnvägsgruppen' },
    type: 'interest',
    imageFileId: 'img-g1',
    primarySpaceId: 's2',
  },
  { _id: 'g2', name: { sv: 'IT-gruppen' }, type: 'function' },
  { _id: 'g3', name: { sv: 'Trägruppen' }, type: 'steering' },
  { _id: 'g4', name: { sv: 'Ugnsgruppen' }, type: 'responsibility' },
];

const SPACES = [
  {
    _id: 's1',
    spaceId: 'textile_workshop',
    floor: 'floor2',
    name: { sv: 'Textilrummet', en: 'The textile room' },
    description: { sv: 'Rummet längst in.' },
    iconSize: 120,
  },
  // Same spaceId on both floors — the real map has this with "kitchen", and it
  // is why the key is the (spaceId, floor) pair.
  { _id: 's2', spaceId: 'kitchen', floor: 'floor1', name: { sv: 'Köket' } },
  { _id: 's3', spaceId: 'kitchen', floor: 'floor2', name: { sv: 'Köket' } },
  { _id: 's4', spaceId: 'storage', floor: 'floor1', name: { sv: 'Förrådet' } },
  { _id: 's5', spaceId: 'glass_workshop', floor: 'floor1', name: { sv: 'Glasrummet' } },
];

// Stand-ins for the real URL builders, so the shape can be checked without
// Meteor: absolute, and null when the entity has nothing to serve.
const iconUrlFor = (spaceId) => `https://umsme.example/api/spaces/${spaceId}/icon?v=ico`;
const imageUrlFor = ({ doc, kind }) =>
  doc.imageFileId
    ? `https://umsme.example/api/${kind}s/${doc._id}/image?v=${doc.imageFileId}`
    : null;

// buildDirectory returns { entries, spaces, palette }; most assertions below
// only care about the entries.
const buildAll = (over = {}) =>
  buildDirectory({
    workshops: WORKSHOPS,
    groups: GROUPS,
    spaces: SPACES,
    iconUrlFor,
    imageUrlFor,
    ...over,
  });
const build = (over = {}) => buildAll(over).entries;

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
      assert.deepStrictEqual(buildDirectory({ iconUrlFor, imageUrlFor }).entries, []);
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

  describe('space links on an entry', function () {
    const spacesOf = (id) => byId(build(), id).spaces;

    it('lists the primary space first, then the secondaries in order', function () {
      assert.deepStrictEqual(
        spacesOf('textilverkstad').map((s) => [s.spaceId, s.floor, s.role]),
        [
          ['textile_workshop', 'floor2', 'primary'],
          ['kitchen', 'floor1', 'secondary'],
          ['kitchen', 'floor2', 'secondary'],
        ]
      );
    });

    it('colors the primary green and cycles the secondaries', function () {
      assert.deepStrictEqual(
        spacesOf('textilverkstad').map((s) => s.color),
        ['green', 'blue', 'amber']
      );
    });

    it('distinguishes the two kitchens by floor', function () {
      const kitchens = spacesOf('textilverkstad').filter((s) => s.spaceId === 'kitchen');
      assert.deepStrictEqual(kitchens.map((s) => s.floor), ['floor1', 'floor2']);
    });

    it('omits spaces entirely for an entity with no primary space', function () {
      // Matches the app: spacesMapView returns null without a primary, and
      // promoting the first secondary to "primary" would be a lie.
      assert.ok(!('spaces' in byId(build(), 'it-gruppen')));
      assert.ok(!('spaces' in byId(build(), 'keramikverkstad')));
    });

    it('ignores a link to a space that does not exist', function () {
      const entries = buildAll({
        workshops: [
          { _id: 'w9', name: { sv: 'Spök' }, status: 'trial', primarySpaceId: 'gone' },
        ],
        groups: [],
      }).entries;
      assert.ok(!('spaces' in entries[0]));
    });
  });

  describe('spaces', function () {
    const spaces = () => buildAll().spaces;
    const space = (spaceId, floor) =>
      spaces().find((s) => s.spaceId === spaceId && s.floor === floor);

    it('publishes every space, linked or not', function () {
      assert.deepStrictEqual(
        spaces().map((s) => `${s.spaceId}/${s.floor}`),
        [
          'textile_workshop/floor2',
          'kitchen/floor1',
          'kitchen/floor2',
          'storage/floor1',
          'glass_workshop/floor1',
        ]
      );
    });

    it('names the workshop that occupies it', function () {
      assert.strictEqual(space('textile_workshop', 'floor2').workshop, 'textilverkstad');
    });

    it('lists groups separately from the workshop', function () {
      const kitchen = space('kitchen', 'floor1');
      assert.strictEqual(kitchen.workshop, 'textilverkstad');
      assert.deepStrictEqual(kitchen.groups, ['modelljarnvagsgruppen']);
    });

    it('leaves an unoccupied space without links', function () {
      const storage = space('storage', 'floor1');
      assert.ok(!('workshop' in storage));
      assert.ok(!('groups' in storage));
      assert.deepStrictEqual(storage.name, { sv: 'Förrådet' });
    });

    it('gives a forming workshop’s space no dangling reference', function () {
      const glass = space('glass_workshop', 'floor1');
      assert.ok(!('workshop' in glass), 'would point at an id absent from entries');
    });

    it('every reference resolves to an entry', function () {
      const ids = new Set(buildAll().entries.map((e) => e.id));
      for (const s of spaces()) {
        if (s.workshop) assert.ok(ids.has(s.workshop), s.workshop);
        for (const g of s.groups || []) assert.ok(ids.has(g), g);
      }
    });

    it('carries name, text, icon and icon size', function () {
      const textile = space('textile_workshop', 'floor2');
      assert.deepStrictEqual(textile.name, { sv: 'Textilrummet', en: 'The textile room' });
      assert.deepStrictEqual(textile.text, { sv: 'Rummet längst in.' });
      assert.strictEqual(textile.icon, 'https://umsme.example/api/spaces/s1/icon?v=ico');
      assert.strictEqual(textile.iconSize, 120);
    });

    it('omits iconSize and text when unset', function () {
      const storage = space('storage', 'floor1');
      assert.ok(!('iconSize' in storage));
      assert.ok(!('text' in storage));
    });
  });

  describe('palette', function () {
    it('ships the colors so the website need not hardcode them', function () {
      const { palette } = buildAll();
      assert.strictEqual(palette.green, '#5fc86f');
      assert.deepStrictEqual(
        Object.keys(palette),
        ['green', 'blue', 'amber', 'purple', 'coral']
      );
    });
  });

  describe('ids', function () {
    it('keeps slugs unique across workshops and groups together', function () {
      const { entries } = buildDirectory({
        workshops: [{ _id: 'w9', name: { sv: 'Textil' }, status: 'trial' }],
        groups: [{ _id: 'g9', name: { sv: 'Textil' }, type: 'interest' }],
        iconUrlFor,
        imageUrlFor,
      });
      assert.deepStrictEqual(entries.map((e) => e.id).sort(), ['textil', 'textil-2']);
    });
  });
});
