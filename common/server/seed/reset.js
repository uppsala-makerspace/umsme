import { MongoInternals } from 'meteor/mongo';

/**
 * Empty every collection in the connected database. Documents only: indexes
 * stay, since they are created at startup before seeding runs.
 *
 * Only call this after assertSeedTarget has accepted the database.
 */
export const emptyDatabase = async () => {
  const { db } = MongoInternals.defaultRemoteCollectionDriver().mongo;
  const collections = await db.listCollections({}, { nameOnly: true }).toArray();
  for (const { name } of collections) {
    if (name.startsWith('system.')) continue;
    await db.collection(name).deleteMany({});
  }
};
