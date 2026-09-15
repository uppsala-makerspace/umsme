import { stableStorageString, storageDigest } from './storageDigest';

export const LEGACY_STORAGE_MIGRATION_VERSION = 'legacy-storage-v1';

export const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
export const compareId = (a, b) => String(a?._id || '').localeCompare(String(b?._id || ''));

export const stableStorageMigrationString = stableStorageString;
export const storageMigrationFingerprint = storageDigest;

/**
 * Keep this projection shared by migration and readiness checks. Adding an
 * unrelated member field must not create migration drift, while changing any
 * legacy storage input must do so.
 */
export const normalizeLegacyStorageMigrationSource = ({
  walls, members, memberships, comments, cutoff,
}) => ({
  version: LEGACY_STORAGE_MIGRATION_VERSION,
  cutoff: new Date(cutoff),
  walls: [...(walls || [])].map((wall) => ({
    name: wall.name,
    floor: wall.floor,
    start: wall.start,
    end: wall.end,
    shelfSize: wall.shelfSize,
  })).sort((a, b) => stableStorageMigrationString(a).localeCompare(stableStorageMigrationString(b))),
  members: [...(members || [])].map((member) => ({
    _id: member._id,
    infamily: member.infamily,
    lab: member.lab,
    storage: member.storage,
    storagequeue: member.storagequeue,
    storagerequest: member.storagerequest,
    has_storagerequest: hasOwn(member, 'storagerequest'),
  })).sort(compareId),
  memberships: [...(memberships || [])].map((membership) => ({
    _id: membership._id,
    mid: membership.mid,
    type: membership.type,
    start: membership.start,
    labend: membership.labend,
  })).sort(compareId),
  comments: [...(comments || [])].map((comment) => ({
    _id: comment._id,
    about: comment.about,
    text: comment.text,
    created: comment.created,
    modified: comment.modified,
  })).sort(compareId),
});

export const storageMigrationFingerprintForSource = (source) =>
  storageMigrationFingerprint(normalizeLegacyStorageMigrationSource(source));
