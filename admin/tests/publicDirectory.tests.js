import assert from 'assert';
import {
  buildDirectory,
  PUBLIC_WORKSHOP_STATUSES,
  PUBLIC_GROUP_TYPES,
  PAST_EVENTS,
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
  // Areas of interest share the collection: published like workshops, but with
  // their own kind, and never a space's single `workshop`.
  {
    _id: 'ia1',
    kind: 'areaOfInterest',
    name: { sv: 'Modelljärnväg' },
    status: 'established',
    imageFileId: 'img-ia1',
    primarySpaceId: 's2',
  },
  { _id: 'ia2', kind: 'areaOfInterest', name: { sv: 'Biohacking' }, status: 'forming' },
];

const GROUPS = [
  { _id: 'g2', name: { sv: 'IT-gruppen' }, type: 'function', imageFileId: 'img-g2' },
  { _id: 'g3', name: { sv: 'Trägruppen' }, type: 'steering' },
  { _id: 'g4', name: { sv: 'Ugnsgruppen' }, type: 'responsibility' },
  // A leftover interest group (the type is gone) must not be published.
  { _id: 'g5', name: { sv: 'Gamla intressegruppen' }, type: 'interest' },
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
// Meteor: absolute, and null when the entity has nothing to serve. Like the
// real one, workshops and areas of interest share the workshop image route.
const iconUrlFor = (spaceId) => `https://umsme.example/api/spaces/${spaceId}/icon?v=ico`;
const imageUrlFor = ({ doc, kind }) =>
  doc.imageFileId
    ? `https://umsme.example/api/${kind === 'group' ? 'groups' : 'workshops'}/${doc._id}/image?v=${doc.imageFileId}`
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

    it('publishes established and trial areas of interest under their own kind', function () {
      const ids = build().filter((e) => e.kind === 'areaOfInterest').map((e) => e.id);
      assert.deepStrictEqual(ids, ['modelljarnvag']);
    });

    it('publishes only function groups', function () {
      assert.deepStrictEqual(PUBLIC_GROUP_TYPES, ['function']);
      const ids = build().filter((e) => e.kind === 'group').map((e) => e.id);
      assert.deepStrictEqual(ids, ['it-gruppen']);
    });

    it('leaves out forming, decommissioned, steering, responsibility and interest groups', function () {
      const ids = build().map((e) => e.id);
      for (const gone of [
        'glasverkstad',
        'morkrumsverkstad',
        'biohacking',
        'tragruppen',
        'ugnsgruppen',
        'gamla-intressegruppen',
      ]) {
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

    it('gives an area of interest a status and no type', function () {
      const entry = byId(build(), 'modelljarnvag');
      assert.strictEqual(entry.kind, 'areaOfInterest');
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
        byId(build(), 'it-gruppen').image,
        'https://umsme.example/api/groups/g2/image?v=img-g2'
      );
    });

    it('builds the area of interest image url from the workshop route', function () {
      assert.strictEqual(
        byId(build(), 'modelljarnvag').image,
        'https://umsme.example/api/workshops/ia1/image?v=img-ia1'
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

    it('lists areas of interest separately from the workshop', function () {
      const kitchen = space('kitchen', 'floor1');
      assert.strictEqual(kitchen.workshop, 'textilverkstad');
      assert.deepStrictEqual(kitchen.areasOfInterest, ['modelljarnvag']);
      assert.ok(!('groups' in kitchen));
    });

    it('never makes an area of interest a space’s workshop', function () {
      const { spaces: only } = buildDirectory({
        workshops: [
          { _id: 'ia9', kind: 'areaOfInterest', name: { sv: 'Vinyl' }, status: 'trial', primarySpaceId: 's4' },
        ],
        spaces: SPACES,
        iconUrlFor,
        imageUrlFor,
      });
      const storage = only.find((s) => s.spaceId === 'storage');
      assert.ok(!('workshop' in storage));
      assert.deepStrictEqual(storage.areasOfInterest, ['vinyl']);
    });

    it('leaves an unoccupied space without links', function () {
      const storage = space('storage', 'floor1');
      assert.ok(!('workshop' in storage));
      assert.ok(!('areasOfInterest' in storage));
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
        for (const a of s.areasOfInterest || []) assert.ok(ids.has(a), a);
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
        groups: [{ _id: 'g9', name: { sv: 'Textil' }, type: 'function' }],
        iconUrlFor,
        imageUrlFor,
      });
      assert.deepStrictEqual(entries.map((e) => e.id).sort(), ['textil', 'textil-2']);
    });
  });

  describe('activities and events', function () {
    const now = new Date('2026-11-10T12:00:00Z');
    const at = (iso) => new Date(iso);
    const CATEGORIES = [
      { _id: 'c2', name: { sv: 'Socialt', en: 'Social' }, sortOrder: 2 },
      { _id: 'c1', name: { sv: 'Kurs' }, sortOrder: 1 },
    ];
    const ACTIVITIES = [
      {
        _id: 'a1', name: { sv: 'Textilintro', en: 'Textile intro' }, description: { sv: 'Symaskinen.' },
        published: true, categoryId: 'c1', workshopId: 'w1', groupId: 'g2', spaceId: 's1', durationMinutes: 120, membersOnly: true,
        imageFileId: 'img-a1',
      },
      { _id: 'a2', name: { sv: 'Hemlig kurs' }, published: false },
      // Its workshop is forming, so it is not referred to.
      { _id: 'a3', name: { sv: 'Glasintro' }, published: true, workshopId: 'w3' },
    ];
    const EVENTS = [
      { _id: 'e1', activityId: 'a1', start: at('2026-11-01T17:00:00Z'), end: at('2026-11-01T19:00:00Z'), status: 'confirmed' },
      { _id: 'e2', activityId: 'a1', start: at('2026-11-20T17:00:00Z'), end: at('2026-11-20T19:00:00Z'), status: 'confirmed', spaceId: 's2' },
      { _id: 'e3', activityId: 'a1', start: at('2026-11-15T17:00:00Z'), end: at('2026-11-15T19:00:00Z'), status: 'cancelled', name: { sv: 'Extra intro' } },
      { _id: 'e4', activityId: 'a1', start: at('2026-11-16T17:00:00Z'), end: at('2026-11-16T19:00:00Z'), status: 'confirmed', published: false },
      { _id: 'e5', activityId: 'a2', start: at('2026-11-16T17:00:00Z'), end: at('2026-11-16T19:00:00Z'), status: 'confirmed', published: true },
      {
        _id: 'e6', name: { sv: 'Städdag' }, description: { sv: 'Vi städar.' }, groupId: 'g2', spaceId: 's4',
        start: at('2026-11-29T09:00:00Z'), end: at('2026-11-29T14:00:00Z'), status: 'confirmed', published: true, imageFileId: 'img-e6',
      },
      { _id: 'e7', name: { sv: 'Internt möte' }, start: at('2026-11-29T09:00:00Z'), end: at('2026-11-29T10:00:00Z'), status: 'confirmed' },
    ];
    const imageUrlFor = ({ doc, kind }) => (doc.imageFileId ? `https://umsme.example/api/${kind}/${doc._id}/image` : null);
    const directory = () => buildAll({ activities: ACTIVITIES, events: EVENTS, categories: CATEGORIES, now, imageUrlFor });

    it('publishes the published activities as entries of their own kind', function () {
      const ids = directory().entries.filter((e) => e.kind === 'activity').map((e) => e.id);
      assert.deepStrictEqual(ids, ['textilintro', 'glasintro']);
    });

    it('describes an activity and refers to what it is shown at by entry id', function () {
      const intro = byId(directory().entries, 'textilintro');
      assert.deepStrictEqual(intro.name, { sv: 'Textilintro', en: 'Textile intro' });
      assert.strictEqual(intro.category, 'kurs');
      assert.strictEqual(intro.workshop, 'textilverkstad');
      assert.strictEqual(intro.group, 'it-gruppen');
      assert.deepStrictEqual(intro.space, { spaceId: 'textile_workshop', floor: 'floor2' });
      assert.strictEqual(intro.image, 'https://umsme.example/api/activity/a1/image');
      assert.strictEqual(intro.membersOnly, true);
      assert.strictEqual(byId(directory().entries, 'glasintro').workshop, undefined);
    });

    it("shows an activity that names no workshop at its group's, and its events with it", function () {
      const workshops = [{ _id: 'wk', name: { sv: 'Keramikverkstaden' }, status: 'established', groupId: 'steer' }];
      const groups = [
        { _id: 'steer', name: { sv: 'Styrgrupp Keramik' }, type: 'steering' },
        { _id: 'glaze', name: { sv: 'Glasyrgruppen' }, type: 'responsibility', parentGroupId: 'steer' },
        { _id: 'it', name: { sv: 'IT-gruppen' }, type: 'function' },
      ];
      const start = new Date(now.getTime() + 86400000);
      const { entries, events } = buildAll({
        workshops, groups, now,
        activities: [
          { _id: 'ga', name: { sv: 'Glasyrkväll' }, groupId: 'glaze', published: true },
          { _id: 'ia', name: { sv: 'IT-kväll' }, groupId: 'it', published: true },
        ],
        events: [{ _id: 'free', name: { sv: 'Glasyrdag' }, groupId: 'glaze', published: true, start, end: new Date(start.getTime() + 3600000) }],
      });
      assert.strictEqual(byId(entries, 'glasyrkvall').workshop, 'keramikverkstaden');
      assert.strictEqual(byId(entries, 'it-kvall').workshop, undefined);
      assert.strictEqual(events[0].workshop, 'keramikverkstaden');
    });

    it('lists an activity’s published events to come, soonest first, cancelled ones marked', function () {
      const { events } = byId(directory().entries, 'textilintro');
      assert.deepStrictEqual(events.map((e) => [e.start, e.status]), [
        ['2026-11-15T17:00:00.000Z', 'cancelled'],
        ['2026-11-20T17:00:00.000Z', 'confirmed'],
      ]);
      assert.deepStrictEqual(events[0].name, { sv: 'Extra intro' });
      assert.strictEqual(events[1].name, undefined);
      assert.deepStrictEqual(events[1].space, { spaceId: 'kitchen', floor: 'floor1' });
      assert.strictEqual(events[0].space.spaceId, 'textile_workshop');
    });

    it('lists an activity’s latest past events, latest first, the same shape', function () {
      const intro = byId(directory().entries, 'textilintro');
      assert.deepStrictEqual(intro.pastEvents, [
        { start: '2026-11-01T17:00:00.000Z', end: '2026-11-01T19:00:00.000Z', status: 'confirmed', registration: 'none',
          space: { spaceId: 'textile_workshop', floor: 'floor2' } },
      ]);
      assert.strictEqual(byId(directory().entries, 'glasintro').pastEvents, undefined);
      // A free-standing event that is over is not published anywhere.
      const over = { _id: 'e8', name: { sv: 'Gammal städdag' }, start: at('2026-10-01T09:00:00Z'), end: at('2026-10-01T12:00:00Z'), status: 'confirmed', published: true };
      const { events } = buildAll({ activities: ACTIVITIES, events: [...EVENTS, over], categories: CATEGORIES, now, imageUrlFor });
      assert.deepStrictEqual(events.map((e) => e.id), ['staddag-2026-11-29']);
    });

    it('publishes at most the latest past events of an activity', function () {
      const many = Array.from({ length: PAST_EVENTS + 2 }, (_, i) => ({
        _id: `p${i}`, activityId: 'a1', status: 'confirmed',
        start: new Date(Date.UTC(2026, 9, i + 1, 17)), end: new Date(Date.UTC(2026, 9, i + 1, 19)),
      }));
      const { pastEvents } = byId(buildAll({ activities: ACTIVITIES, events: many, now }).entries, 'textilintro');
      assert.strictEqual(pastEvents.length, PAST_EVENTS);
      assert.strictEqual(pastEvents[0].start, new Date(Date.UTC(2026, 9, PAST_EVENTS + 2, 17)).toISOString());
    });

    it('publishes free-standing events that are published, apart', function () {
      const { events } = directory();
      assert.deepStrictEqual(events.map((e) => e.id), ['staddag-2026-11-29']);
      assert.strictEqual(events[0].group, 'it-gruppen');
      assert.strictEqual(events[0].image, 'https://umsme.example/api/event/e6/image');
      assert.deepStrictEqual(events[0].text, { sv: 'Vi städar.' });
    });

    it('lists the categories in their order', function () {
      assert.deepStrictEqual(directory().categories, [
        { id: 'kurs', name: { sv: 'Kurs' } },
        { id: 'socialt', name: { sv: 'Socialt', en: 'Social' } },
      ]);
    });

    it('has empty lists when there is nothing', function () {
      const { events, categories } = buildAll();
      assert.deepStrictEqual([events, categories], [[], []]);
    });
  });

  describe('registration and hosts', function () {
    const now = new Date('2026-11-10T12:00:00Z');
    const day = (d) => ({ start: new Date(`2026-11-${d}T17:00:00Z`), end: new Date(`2026-11-${d}T19:00:00Z`), status: 'confirmed' });
    const memberNames = { m1: 'Anna Andersson', m2: '  Bo  Berg ', m3: 'Cecilia Ceder' };
    const ACTIVITIES = [
      // Sign-up required, hosts shown: what its events have unless they say otherwise.
      { _id: 'a1', name: { sv: 'Svarvkurs' }, published: true, registration: 'required', hostsPublished: true, maxSeats: 6 },
      // Nothing set: no sign-up, hosts not shown.
      { _id: 'a2', name: { sv: 'Öppen kväll' }, published: true },
    ];
    const EVENTS = [
      // Takes both from the activity; a host no longer a member is left out.
      { _id: 'e1', activityId: 'a1', ...day(11), hostMemberIds: ['m1', 'gone', 'm2'], seatsTaken: 4 },
      // Says otherwise on both.
      { _id: 'e2', activityId: 'a1', ...day(12), hostMemberIds: ['m1'], hostsPublished: false, registration: 'optional', maxSeats: 3, seatsTaken: 5 },
      // Shows hosts, though its activity does not.
      { _id: 'e3', activityId: 'a2', ...day(13), hostMemberIds: ['m3'], hostsPublished: true },
      // Shown hosts, but none.
      { _id: 'e4', activityId: 'a1', ...day(14), hostMemberIds: [] },
      // Free-standing: its own.
      { _id: 'e5', name: { sv: 'Planering ny webb' }, ...day(15), published: true, registration: 'optional', hostsPublished: true, hostMemberIds: ['m2'], maxSeats: 10, seatsTaken: 2 },
      { _id: 'e6', name: { sv: 'Besök från kommunen' }, ...day(16), published: true, hostMemberIds: ['m1'] },
    ];
    const directory = () => buildAll({ activities: ACTIVITIES, events: EVENTS, memberNames, now });
    const eventsOf = (id) => byId(directory().entries, id).events;

    it('says whether one signs up, for an activity and each event', function () {
      assert.strictEqual(byId(directory().entries, 'svarvkurs').registration, 'required');
      assert.strictEqual(byId(directory().entries, 'oppen-kvall').registration, 'none');
      assert.deepStrictEqual(eventsOf('svarvkurs').map((e) => e.registration), ['required', 'optional', 'required']);
      assert.deepStrictEqual(eventsOf('oppen-kvall').map((e) => e.registration), ['none']);
      assert.deepStrictEqual(directory().events.map((e) => e.registration), ['optional', 'none']);
    });

    it('gives the seats and those left, only where one signs up with a limit', function () {
      assert.strictEqual(byId(directory().entries, 'svarvkurs').seats, 6);
      assert.strictEqual(byId(directory().entries, 'oppen-kvall').seats, undefined);
      // Inherited 6 with 4 taken; its own 3 with 5 taken is full, not negative; none taken.
      assert.deepStrictEqual(eventsOf('svarvkurs').map((e) => [e.seats, e.seatsLeft]), [[6, 2], [3, 0], [6, 6]]);
      assert.deepStrictEqual(eventsOf('oppen-kvall').map((e) => [e.seats, e.seatsLeft]), [[undefined, undefined]]);
      assert.deepStrictEqual(directory().events.map((e) => [e.seats, e.seatsLeft]), [[10, 8], [undefined, undefined]]);
    });

    it('names the hosts by first name, only where the activity or event shows them', function () {
      assert.deepStrictEqual(eventsOf('svarvkurs').map((e) => e.hosts), [['Anna', 'Bo'], undefined, undefined]);
      assert.deepStrictEqual(eventsOf('oppen-kvall').map((e) => e.hosts), [['Cecilia']]);
      assert.deepStrictEqual(directory().events.map((e) => e.hosts), [['Bo'], undefined]);
    });

    it('publishes nothing else about the hosts', function () {
      const json = JSON.stringify(directory());
      for (const hidden of ['Andersson', 'Berg', 'Ceder', 'm1', 'm2', 'm3', 'hostMemberIds', 'hostsPublished']) {
        assert.ok(!json.includes(hidden), `${hidden} is published`);
      }
    });
  });
});
