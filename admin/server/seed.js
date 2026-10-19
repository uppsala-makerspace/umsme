import { seedScenario } from '/imports/common/server/seed';
import { buildDemo, demoLoginSummary } from '/imports/common/server/seed/scenarios/demo';
import { buildE2e, e2eLoginSummary } from '/imports/common/server/seed/scenarios/e2e';

const SCENARIOS = {
  demo: { build: buildDemo, summary: demoLoginSummary },
  e2e: { build: buildE2e, summary: e2eLoginSummary },
};

/**
 * Seed the scenario named by the SEED environment variable, if any. Runs
 * before anything else at startup, since it empties the database.
 *
 * A refused or failed seed stops the server: carrying on would leave it
 * running against a database it was told to replace.
 */
export default async () => {
  const name = process.env.SEED;
  if (!name) return null;
  const scenario = SCENARIOS[name];
  try {
    if (!scenario) throw new Error(`No seed scenario "${name}" in admin; available: ${Object.keys(SCENARIOS).join(', ')}`);
    await seedScenario(name, scenario.build);
  } catch (error) {
    console.error(`[seed] ${error.message}`);
    process.exit(1);
  }
  return scenario.summary;
};
