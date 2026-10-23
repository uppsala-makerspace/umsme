import { Meteor } from 'meteor/meteor';

/**
 * Data for the admin console: the methods. The page's container uses this;
 * the pure components never do.
 */

/** Resolves to the sync's report: the unlocks of the last day. */
export const syncLock = () => Meteor.callAsync('forceSyncDoorUnlocks');
export const mergePreview = (sourceMid, destMid) => Meteor.callAsync('members.mergePreview', sourceMid, destMid);
export const mergeMembers = (sourceMid, destMid) => Meteor.callAsync('members.merge', sourceMid, destMid);
/** Resolves to { name, count }, or null when no certificate is mandatory. */
export const mandatoryGrantCount = () => Meteor.callAsync('certificates.mandatoryGrantCount')
  .catch((e) => { if (e.error === 'no-mandatory') return null; throw e; });
/** Resolves to the number of attestations made. */
export const grantMandatoryToAll = () => Meteor.callAsync('certificates.grantMandatoryToAll');
/** Resolves to { scanned, withMember, withExtid, skipped }. */
export const migrateUnlocks = () => Meteor.callAsync('migrateUnlocksToDoorUnlocks');
/** Resolves to { total, changed }: the members gone through, and those put right. */
export const updateMemberDates = () => Meteor.callAsync('updateMembers');
