/**
 * Seeding empties every collection before it writes. The guard makes sure it
 * can only ever do so in a database meant for it: never production, never a
 * local copy of production.
 *
 * Two conditions, both required:
 * - the database name ends in "-<scenario>" ("umsme-e2e", "umsme-demo"), and
 * - `private.recipientWhitelist` is an empty list, so that nothing the
 *   scenario does (mail, push) reaches anyone.
 */
export const SCENARIOS = ['e2e', 'demo'];

/** The database name in a MongoDB connection string, or null. */
export const databaseName = (mongoUrl) => {
  const match = /^mongodb(?:\+srv)?:\/\/[^/]+\/([^?]+)/.exec(mongoUrl || '');
  return match ? decodeURIComponent(match[1]) : null;
};

/**
 * Throws, with the reason, unless `scenario` may be seeded into the database
 * at `mongoUrl` with these settings.
 */
export const assertSeedTarget = ({ scenario, mongoUrl, settings }) => {
  if (!SCENARIOS.includes(scenario)) {
    throw new Error(`Unknown seed scenario "${scenario}"; expected one of ${SCENARIOS.join(', ')}`);
  }
  const name = databaseName(mongoUrl);
  if (!name) {
    throw new Error('Refusing to seed: MONGO_URL names no database');
  }
  if (!name.endsWith(`-${scenario}`)) {
    throw new Error(`Refusing to seed "${scenario}" into database "${name}": its name must end in "-${scenario}"`);
  }
  const whitelist = settings?.private?.recipientWhitelist;
  if (!Array.isArray(whitelist) || whitelist.length > 0) {
    throw new Error('Refusing to seed: private.recipientWhitelist must be an empty list, so that no mail or push leaves');
  }
  return name;
};
