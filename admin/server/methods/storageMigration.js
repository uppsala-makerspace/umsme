import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/roles';
import {
  applyLegacyStorageMigration,
  finalizeLegacyStorageCutover,
  previewLegacyStorageMigration,
  validateStorageMigrationState,
} from '../storageMigration';

export const requireStorageMigrationOperator = async (userId, roleService = Roles) => {
  if (!userId || !(await roleService.userIsInRoleAsync(userId, ['admin', 'board']))) {
    throw new Meteor.Error('not-authorized', 'Admin or board role required');
  }
};

const asMeteorError = (error) => {
  if (error instanceof Meteor.Error) return error;
  return new Meteor.Error(
    error.code || 'storage-migration-failed',
    error.message || 'Storage migration failed',
    error.details ? JSON.stringify(error.details) : undefined,
  );
};

Meteor.methods({
  async 'storageMigration.preview'() {
    await requireStorageMigrationOperator(this.userId);
    return previewLegacyStorageMigration();
  },

  async 'storageMigration.status'() {
    await requireStorageMigrationOperator(this.userId);
    return validateStorageMigrationState();
  },

  async 'storageMigration.apply'({ fingerprint, cutoff } = {}) {
    await requireStorageMigrationOperator(this.userId);
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
    await requireStorageMigrationOperator(this.userId);
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
