import { ACTIVE_STORAGE_REQUEST_STATUSES } from '/imports/common/lib/storageRules';
import { Meteor } from 'meteor/meteor';
import { Members } from '/imports/common/collections/members';
import { Memberships } from '/imports/common/collections/memberships';
import { Comments } from '/imports/common/collections/comments';
import {
  StorageWalls,
  StorageUnits,
  StorageRequests,
  StorageOffers,
  StorageEvents,
} from '/imports/common/collections/storage';
import {
  storageAllocationReadiness,
  STORAGE_CUTOVER_FINALIZED_ID,
  STORAGE_MIGRATION_SUMMARY_ID,
} from '/imports/common/server/storage/readiness';
import {
  buildLegacyStorageMigrationPlan,
  diffLegacyMigrationDocuments,
  LEGACY_STORAGE_MIGRATION_VERSION,
} from '/imports/storage/legacyMigration';

const collections = {
  storageWalls: StorageWalls,
  storageUnits: StorageUnits,
  storageRequests: StorageRequests,
  storageOffers: StorageOffers,
  storageEvents: StorageEvents,
};

export const STORAGE_MIGRATION_SUMMARY_EVENT_ID = STORAGE_MIGRATION_SUMMARY_ID;
export const STORAGE_MIGRATION_FINALIZED_EVENT_ID = STORAGE_CUTOVER_FINALIZED_ID;

const loadLegacySource = async () => ({
  walls: Meteor.settings.public?.storageWalls || [],
  members: await Members.find({}).fetchAsync(),
  memberships: await Memberships.find({}).fetchAsync(),
  comments: await Comments.find({ about: { $regex: '^_box' } }).fetchAsync(),
});

const publicPlan = (plan) => ({
  version: plan.version,
  cutoff: plan.cutoff,
  fingerprint: plan.fingerprint,
  preview_report: plan.report,
});

const publicTargetPreflight = ({ blocker_count, blockers, insert_counts, already_present_counts }) => ({
  blocker_count,
  blockers,
  insert_counts,
  already_present_counts,
});

export const previewLegacyStorageMigration = async ({ cutoff = new Date() } = {}) => {
  const source = await loadLegacySource();
  const plan = buildLegacyStorageMigrationPlan({ ...source, cutoff });
  return {
    ...publicPlan(plan),
    target_preflight: publicTargetPreflight(await preflightLegacyStorageMigration(plan)),
    current_state: await validateStorageMigrationState(),
  };
};

const existingDocuments = async (documents) => Object.fromEntries(await Promise.all(
  Object.entries(documents).map(async ([name, desired]) => [
    name,
    await collections[name].find({ _id: { $in: desired.map((document) => document._id) } }).fetchAsync(),
  ]),
));

const naturalKeyConflicts = async (documents) => {
  const conflicts = [];
  for (const wall of documents.storageWalls) {
    const found = await StorageWalls.findOneAsync({ _id: { $ne: wall._id }, name: wall.name });
    if (found) conflicts.push({ collection: 'storageWalls', id: wall._id, code: 'wall_natural_key_conflict', existing_id: found._id });
  }
  for (const unit of documents.storageUnits) {
    const found = await StorageUnits.findOneAsync({
      _id: { $ne: unit._id },
      $or: [
        { name: unit.name },
        { wall_id: unit.wall_id, column: unit.column, row: unit.row },
      ],
    });
    if (found) conflicts.push({ collection: 'storageUnits', id: unit._id, code: 'unit_natural_key_conflict', existing_id: found._id });
  }
  for (const request of documents.storageRequests) {
    const found = await StorageRequests.findOneAsync({
      _id: { $ne: request._id }, owner: request.owner,
      request_status: { $in: ACTIVE_STORAGE_REQUEST_STATUSES },
    });
    if (found) conflicts.push({ collection: 'storageRequests', id: request._id, code: 'active_request_conflict', existing_id: found._id });
  }
  return conflicts;
};

/** Shared, read-only target validation used by preview and apply. */
export const preflightLegacyStorageMigration = async (plan) => {
  const existing = await existingDocuments(plan.documents);
  const difference = diffLegacyMigrationDocuments(plan.documents, existing);
  difference.conflicts.push(...await naturalKeyConflicts(plan.documents));
  return {
    blocker_count: difference.conflicts.length,
    blockers: difference.conflicts,
    insert_counts: Object.fromEntries(
      Object.entries(difference.inserts).map(([name, records]) => [name, records.length]),
    ),
    already_present_counts: Object.fromEntries(
      Object.entries(difference.already_present).map(([name, ids]) => [name, ids.length]),
    ),
    difference,
  };
};

export const validateStorageMigrationState = async ({ legacySource } = {}) => {
  const [readiness, walls, units, requests, offers, applied] = await Promise.all([
    storageAllocationReadiness({ legacySource }),
    StorageWalls.find({}).fetchAsync(),
    StorageUnits.find({}).fetchAsync(),
    StorageRequests.find({}).fetchAsync(),
    StorageOffers.find({}).fetchAsync(),
    StorageEvents.findOneAsync(STORAGE_MIGRATION_SUMMARY_EVENT_ID),
  ]);
  const missing = readiness.missing_migrated_documents;
  const manifestErrors = Object.entries(missing).map(([collection, ids]) => ({
    code: 'missing_migrated_documents', collection, ids,
  }));
  const manifest = {
    valid: readiness.manifest_valid,
    complete: readiness.manifest_valid && manifestErrors.length === 0,
    missing,
    errors: readiness.manifest_valid ? manifestErrors : [{ code: 'migration_manifest_invalid' }],
    digest: applied?.details?.manifest?.digest,
  };
  return {
    ...readiness,
    migration_event_id: applied?._id,
    migration_fingerprint: applied?.details?.fingerprint,
    migration_manifest: manifest,
    cutover_finalization_event_id: readiness.cutover_finalized
      ? STORAGE_MIGRATION_FINALIZED_EVENT_ID : undefined,
    legacy_source_check_skipped: readiness.cutover_finalized,
    counts: {
      walls: walls.length,
      units: units.length,
      requests: requests.length,
      offers: offers.length,
      occupied_units: units.filter((unit) => unit.availability_status === 'occupied').length,
      unclassified_units: readiness.unclassified_unit_ids.length,
    },
  };
};

/** Apply only the exact, blocker-free plan an operator previously previewed. */
export const applyLegacyStorageMigration = async ({ fingerprint, cutoff, legacySource }) => {
  const parsedCutoff = new Date(cutoff);
  if (!fingerprint || Number.isNaN(parsedCutoff.getTime())) {
    throw new Error('A preview fingerprint and valid cutoff are required');
  }
  const source = legacySource || await loadLegacySource();
  const plan = buildLegacyStorageMigrationPlan({ ...source, cutoff: parsedCutoff });
  if (plan.fingerprint !== fingerprint) {
    const error = new Error('Legacy storage data changed after preview');
    error.code = 'fingerprint_mismatch';
    throw error;
  }
  if (plan.report.blocker_count) {
    const error = new Error(`Migration has ${plan.report.blocker_count} blocking anomaly/anomalies`);
    error.code = 'migration_blocked';
    error.details = plan.report;
    throw error;
  }

  const targetPreflight = await preflightLegacyStorageMigration(plan);
  const { difference } = targetPreflight;
  if (targetPreflight.blocker_count) {
    const error = new Error('Existing storage data conflicts with the migration plan');
    error.code = 'target_conflict';
    error.details = targetPreflight.blockers;
    throw error;
  }

  const inserted = {};
  for (const name of ['storageWalls', 'storageUnits', 'storageRequests', 'storageOffers', 'storageEvents']) {
    inserted[name] = 0;
    for (const document of difference.inserts[name]) {
      try {
        await collections[name].insertAsync(document);
        inserted[name] += 1;
      } catch (error) {
        // A concurrent/retried insert is harmless only if it produced exactly
        // the desired document. Never overwrite a differing document.
        const found = await collections[name].findOneAsync(document._id);
        const retryDiff = diffLegacyMigrationDocuments(
          { [name]: [document] },
          { [name]: found ? [found] : [] },
        );
        if (retryDiff.conflicts.length || retryDiff.inserts[name].length) throw error;
      }
    }
  }

  return {
    version: plan.version,
    cutoff: plan.cutoff,
    fingerprint: plan.fingerprint,
    preview_report: plan.report,
    target_preflight: {
      blocker_count: targetPreflight.blocker_count,
      blockers: targetPreflight.blockers,
    },
    inserted,
    already_present: Object.fromEntries(
      Object.entries(difference.already_present).map(([name, ids]) => [name, ids.length]),
    ),
    validation: await validateStorageMigrationState({ legacySource }),
  };
};

/**
 * Declare legacy source fields retired. This is intentionally separate from
 * apply so cleanup cannot silently disable the source-drift safety gate.
 */
export const finalizeLegacyStorageCutover = async ({
  fingerprint, actor, reason, now = new Date(), legacySource,
}) => {
  if (!fingerprint || !actor || typeof reason !== 'string' || !reason.trim()) {
    const error = new Error('Fingerprint, operator, and audit reason are required');
    error.code = 'invalid_finalization';
    throw error;
  }
  const existing = await StorageEvents.findOneAsync(STORAGE_MIGRATION_FINALIZED_EVENT_ID);
  if (existing) {
    const existingValidation = await validateStorageMigrationState({ legacySource });
    if (existing.details?.fingerprint !== fingerprint || !existingValidation.cutover_finalized) {
      const error = new Error('Storage cutover was finalized for a different fingerprint');
      error.code = 'finalization_conflict';
      throw error;
    }
    return { already_finalized: true, validation: existingValidation };
  }
  const validation = await validateStorageMigrationState({ legacySource });
  if (!validation.migration_applied || validation.migration_fingerprint !== fingerprint) {
    const error = new Error('Applied migration fingerprint does not match');
    error.code = 'fingerprint_mismatch';
    throw error;
  }
  const blocking = validation.allocation_blocked_reasons.filter(
    (code) => !['unclassified_units', 'cutover_not_finalized'].includes(code),
  );
  if (blocking.length) {
    const error = new Error('Migration must be complete, coherent, and unchanged before finalization');
    error.code = 'finalization_blocked';
    error.details = blocking;
    throw error;
  }
  const occurredAt = new Date(now);
  const finalization = {
    _id: STORAGE_MIGRATION_FINALIZED_EVENT_ID,
    entity_type: 'storageMigration',
    entity_id: LEGACY_STORAGE_MIGRATION_VERSION,
    event_type: 'legacy_storage_cutover_finalized',
    actor_type: 'administrator',
    actor,
    occurred_at: occurredAt,
    reason: reason.trim(),
    details: {
      fingerprint,
      summary_event_id: STORAGE_MIGRATION_SUMMARY_EVENT_ID,
      manifest_digest: validation.migration_manifest.digest,
    },
  };
  try {
    await StorageEvents.insertAsync(finalization);
    return { already_finalized: false, validation: await validateStorageMigrationState() };
  } catch (insertError) {
    // Concurrent confirmations of the same applied fingerprint converge on
    // the first durable audit event. A malformed or different event is never
    // treated as an idempotent success.
    const concurrent = await StorageEvents.findOneAsync(STORAGE_MIGRATION_FINALIZED_EVENT_ID);
    const concurrentValidation = await validateStorageMigrationState({ legacySource });
    if (concurrent?.details?.fingerprint === fingerprint && concurrentValidation.cutover_finalized) {
      return { already_finalized: true, validation: concurrentValidation };
    }
    throw insertError;
  }
};
