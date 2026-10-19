import { seedScenario } from './index';
import { buildDemo, demoLoginSummary } from './scenarios/demo';
import { buildE2e, e2eLoginSummary } from './scenarios/e2e';

const SCENARIOS = {
  demo: { build: buildDemo, summary: demoLoginSummary },
  e2e: { build: buildE2e, summary: e2eLoginSummary },
};

/**
 * Seed the scenario named by the SEED environment variable, if any. Called
 * first thing at startup, since it empties the database.
 *
 * Any app with accounts-password, roles and Collection2 can seed: the app's
 * e2e tests seed in the app itself, the demo seeds in admin, whose own
 * startup then adds the admin login and the storage message templates.
 *
 * A refused or failed seed stops the server: carrying on would leave it
 * running against a database it was told to replace.
 */
export const runSeedFromEnv = async () => {
  const name = process.env.SEED;
  if (!name) return null;
  const scenario = SCENARIOS[name];
  try {
    if (!scenario) throw new Error(`No seed scenario "${name}" ; available: ${Object.keys(SCENARIOS).join(', ')}`);
    await seedScenario(name, scenario.build);
  } catch (error) {
    console.error(`[seed] ${error.message}`);
    process.exit(1);
  }
  return scenario.summary;
};
