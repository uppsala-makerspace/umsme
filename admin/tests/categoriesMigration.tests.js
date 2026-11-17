import assert from 'assert';
import { Groups } from '/imports/common/collections/groups';
import { Workshops } from '/imports/common/collections/workshops';
import { Categories } from '/imports/common/collections/categories';
import { activityCategoriesToCategories } from '../server/migrations';

const prefix = 'categories-migration-test:';

// Raw access throughout: the fixtures are the old shapes the schema no longer allows.
const db = () => Categories.rawDatabase();
const hasCollection = async (name) => (await db().listCollections({ name }, { nameOnly: true }).toArray()).length > 0;

describe('activity categories to categories migration', function () {
  afterEach(async function () {
    if (await hasCollection('activityCategories')) await db().dropCollection('activityCategories');
    await Categories.rawCollection().deleteMany({ _id: { $regex: `^${prefix}` } });
    await Groups.rawCollection().deleteMany({ _id: { $regex: `^${prefix}` } });
    await Workshops.rawCollection().deleteMany({ _id: { $regex: `^${prefix}` } });
  });

  it('renames the collection when categories is empty, and gives each the slug the website knew', async function () {
    // The test database is this suite's own: the other suites leave no categories behind.
    await Categories.rawCollection().deleteMany({});
    await db().collection('activityCategories').insertMany([
      { _id: `${prefix}a`, name: { sv: 'Kurs och introduktion' }, sortOrder: 1 },
      { _id: `${prefix}b`, name: { sv: 'Kurs, och introduktion!' } },
    ]);
    await activityCategoriesToCategories();
    assert.strictEqual(await hasCollection('activityCategories'), false);
    const slugs = (await Categories.rawCollection().find({ _id: { $regex: `^${prefix}` } }).sort({ _id: 1 }).toArray()).map((c) => c.slug);
    assert.deepStrictEqual(slugs, ['kurs-och-introduktion', 'kurs-och-introduktion-2']);
  });

  it('leaves activityCategories alone when categories already has some', async function () {
    await Categories.rawCollection().insertOne({ _id: `${prefix}kept`, name: { sv: 'Kvar' }, slug: 'kvar' });
    await db().collection('activityCategories').insertOne({ _id: `${prefix}old`, name: { sv: 'Gammal' } });
    await activityCategoriesToCategories();
    assert.strictEqual(await hasCollection('activityCategories'), true);
  });

  it('gives a slug around those taken, and drops the tags', async function () {
    await Categories.rawCollection().insertMany([
      { _id: `${prefix}x`, name: { sv: 'Socialt' }, slug: 'socialt' },
      { _id: `${prefix}y`, name: { sv: 'Socialt' } },
    ]);
    await Groups.rawCollection().insertOne({ _id: `${prefix}g`, name: { sv: 'G' }, type: 'function', tag: { sv: 'G' } });
    await Workshops.rawCollection().insertOne({ _id: `${prefix}w`, name: { sv: 'W' }, tag: { sv: 'W' } });
    await activityCategoriesToCategories();
    assert.strictEqual((await Categories.rawCollection().findOne({ _id: `${prefix}y` })).slug, 'socialt-2');
    assert.strictEqual('tag' in (await Groups.rawCollection().findOne({ _id: `${prefix}g` })), false);
    assert.strictEqual('tag' in (await Workshops.rawCollection().findOne({ _id: `${prefix}w` })), false);
    // Once done, nothing is left to do.
    await activityCategoriesToCategories();
  });
});
