/**
 * Building blocks for seeded test and demo data. See plan/test-strategy.md.
 *
 * Scenarios are built from these blocks and run through seedScenario, which
 * refuses any database not meant for seeding before it empties it.
 *
 * Order matters within a scenario: members and their payments first, storage
 * and the rest after, since the storage hooks reconcile a member's units when
 * the member's dates change.
 */
import { Meteor } from 'meteor/meteor';
import { assertSeedTarget } from './guard';
import { emptyDatabase } from './reset';
import { createRandom } from './random';
import { createPeople } from './people';

export { SCENARIOS, assertSeedTarget, databaseName } from './guard';
export { createRandom } from './random';
export { createPeople } from './people';
export { DAY_MS, daysFromNow, monthsFromNow } from './dates';
export { makeUser } from './accounts';
export { PRICES, makeMember, pay, payHistory, joinFamily, inviteToFamily } from './members';
export { makeLiabilityDocument } from './documents';
export { makeStorageWalls, makeStorageUnit, storageLocation } from './storage';

/**
 * Empty the database and run `build` to fill it.
 *
 * @param {string} scenario 'e2e' or 'demo'; the database name must end with it
 * @param {(context: { random, people, now: Date }) => Promise<void>} build
 * @param {{ seed?: number, mongoUrl?: string, settings?: object }} options
 */
export const seedScenario = async (scenario, build, {
  seed = 1,
  mongoUrl = process.env.MONGO_URL,
  settings = Meteor.settings,
} = {}) => {
  const database = assertSeedTarget({ scenario, mongoUrl, settings });
  console.log(`[seed] ${scenario}: emptying ${database}`);
  await emptyDatabase();
  const random = createRandom(seed);
  const now = new Date();
  await build({ random, people: createPeople(random, { now }), now });
  console.log(`[seed] ${scenario}: done`);
};
