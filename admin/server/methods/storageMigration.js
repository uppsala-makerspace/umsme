import { Meteor } from 'meteor/meteor';
import { requireStorageOperator } from '/imports/common/server/storage/access';
import {
  applyLegacyStorageMigration,
  finalizeLegacyStorageCutover,
  previewLegacyStorageMigration,
  validateStorageMigrationState,
} from '../storageMigration';

const asMeteorError = (error) => {
  if (error instanceof Meteor.Error) return error;
  return new Meteor.Error(
    error.code || 'storage-migration-failed',
    error.message || 'Storage migration failed',
    error.details ? JSON.stringify(error.details) : undefined,
  );
};

Meteor.methods({
  async 'storageMigration.preview'({ cutoff } = {}) {
    await requireStorageOperator(this.userId);
    if (cutoff !== undefined && !(cutoff instanceof Date) && typeof cutoff !== 'string') {
      throw new Meteor.Error('invalid-arguments', 'Cutoff must be a date');
    }
    const parsedCutoff = cutoff === undefined ? new Date() : new Date(cutoff);
    if (Number.isNaN(parsedCutoff.getTime())) {
      throw new Meteor.Error('invalid-arguments', 'Cutoff must be a valid date');
    }
    return previewLegacyStorageMigration({ cutoff: parsedCutoff });
  },

  async 'storageMigration.status'() {
    await requireStorageOperator(this.userId);
    return validateStorageMigrationState();
  },

  async 'storageMigration.apply'({ fingerprint, cutoff } = {}) {
    await requireStorageOperator(this.userId);
    if (typeof fingerprint !== 'string' || (!(cutoff instanceof Date) && typeof cutoff !== 'string')) {
      throw new Meteor.Error('invalid-arguments', 'Preview fingerprint and cutoff are required');
    }
    try {
      return await applyLegacyStorageMigration({ fingerprint, cutoff });
    } catch (error) {
      throw asMeteorError(error);
    }
  },

  async 'storageMigration.finalizeCutover'({ fingerprint, reason } = {}) {
    await requireStorageOperator(this.userId);
    if (typeof fingerprint !== 'string' || typeof reason !== 'string' || !reason.trim()) {
      throw new Meteor.Error('invalid-arguments', 'Applied fingerprint and audit reason are required');
    }
    try {
      return await finalizeLegacyStorageCutover({
        fingerprint,
        actor: this.userId,
        reason,
      });
    } catch (error) {
      throw asMeteorError(error);
    }
  },
});
