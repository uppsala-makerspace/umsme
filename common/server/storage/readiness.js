import crypto from 'node:crypto';
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
  LEGACY_STORAGE_MIGRATION_VERSION,
  stableStorageMigrationString,
  storageMigrationFingerprintForSource,
} from '/imports/common/lib/legacyStorageMigrationFingerprint';
import { storageLayoutErrors, storageStateErrors } from '/imports/common/lib/storageRules';

export const STORAGE_MIGRATION_SUMMARY_ID = `${LEGACY_STORAGE_MIGRATION_VERSION}:event:summary`;
export const STORAGE_CUTOVER_FINALIZED_ID = `${LEGACY_STORAGE_MIGRATION_VERSION}:event:cutover-finalized`;

const manifestCollections = {
  storageWalls: StorageWalls,
  storageUnits: StorageUnits,
  storageRequests: StorageRequests,
  storageOffers: StorageOffers,
  storageEvents: StorageEvents,
};

const digest = (value) => crypto.createHash('sha256')
  .update(stableStorageMigrationString(value)).digest('hex');

const loadLegacySource = async (cutoff) => ({
  walls: Meteor.settings.public?.storageWalls || [],
  members: await Members.find({}).fetchAsync(),
  memberships: await Memberships.find({}).fetchAsync(),
  comments: await Comments.find({ about: { $regex: '^_box' } }).fetchAsync(),
  cutoff,
});

const inspectManifest = async (manifest) => {
  const expectedNames = Object.keys(manifestCollections);
  const validShape = manifest?.version === 1 && typeof manifest.digest === 'string' &&
    manifest.documents && expectedNames.every((name) =>
      Array.isArray(manifest.documents[name]) && manifest.documents[name].every((id) => typeof id === 'string'));
  if (!validShape) return { valid: false, missing_migrated_documents: {} };
  const payload = { version: manifest.version, documents: manifest.documents };
  if (digest(payload) !== manifest.digest) return { valid: false, missing_migrated_documents: {} };

  const missing = {};
  for (const name of expectedNames) {
    const expected = [...new Set(manifest.documents[name])];
    const found = expected.length
      ? await manifestCollections[name].find({ _id: { $in: expected } }, { fields: { _id: 1 } }).fetchAsync()
      : [];
    const foundIds = new Set(found.map((document) => document._id));
    const absent = expected.filter((id) => !foundIds.has(id));
    if (absent.length) missing[name] = absent;
  }
  return { valid: true, missing_migrated_documents: missing };
};

export const storageAllocationReadiness = async ({ legacySource } = {}) => {
  const [summary, finalized, walls, units, requests, offers] = await Promise.all([
    StorageEvents.findOneAsync(STORAGE_MIGRATION_SUMMARY_ID),
    StorageEvents.findOneAsync(STORAGE_CUTOVER_FINALIZED_ID),
    StorageWalls.find({}).fetchAsync(),
    StorageUnits.find({}).fetchAsync(),
    StorageRequests.find({}).fetchAsync(),
    StorageOffers.find({}).fetchAsync(),
  ]);

  const manifest = summary?.details?.manifest;
  const manifestState = await inspectManifest(manifest);
  const missingCount = Object.values(manifestState.missing_migrated_documents)
    .reduce((count, ids) => count + ids.length, 0);
  const finalizedValid = !finalized || (
    finalized.event_type === 'legacy_storage_cutover_finalized' &&
    finalized.actor_type === 'administrator' && !!finalized.actor &&
    finalized.details?.summary_event_id === STORAGE_MIGRATION_SUMMARY_ID &&
    finalized.details?.fingerprint === summary?.details?.fingerprint &&
    finalized.details?.manifest_digest === manifest?.digest
  );

  let legacySourceChanged = false;
  if (summary && finalizedValid && !finalized) {
    const currentFingerprint = await storageMigrationFingerprintForSource(
      legacySource
        ? { ...legacySource, cutoff: summary.occurred_at }
        : await loadLegacySource(summary.occurred_at),
    );
    legacySourceChanged = currentFingerprint !== summary.details?.fingerprint;
  }
  const invariantErrors = [
    ...storageStateErrors({ units, requests, offers }),
    ...storageLayoutErrors({ walls, units }),
  ];
  const unclassifiedUnits = units.filter((unit) => !unit.floor || !unit.height);
  const blockedReasons = [
    ...(!summary ? ['migration_not_applied'] : []),
    ...(summary && !manifestState.valid ? ['migration_manifest_invalid'] : []),
    ...(missingCount ? ['migration_manifest_incomplete'] : []),
    ...(!finalizedValid ? ['cutover_finalization_invalid'] : []),
    ...(legacySourceChanged ? ['legacy_source_changed_after_migration'] : []),
    ...(invariantErrors.length ? ['storage_invariant_errors'] : []),
    ...(unclassifiedUnits.length ? ['unclassified_units'] : []),
  ];

  return {
    allocation_ready: blockedReasons.length === 0,
    allocation_blocked_reasons: blockedReasons,
    migration_applied: !!summary,
    cutover_finalized: !!finalized && finalizedValid,
    legacy_source_changed: legacySourceChanged,
    manifest_valid: manifestState.valid,
    missing_migrated_documents: manifestState.missing_migrated_documents,
    invariant_errors: invariantErrors,
    unclassified_unit_ids: unclassifiedUnits.map((unit) => unit._id),
  };
};
