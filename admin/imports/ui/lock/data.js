import { Meteor } from 'meteor/meteor';

/** Every lab member against what the door lock holds for them. */
export const lockOverview = () => Meteor.callAsync('lock.overview');

/** Set the lock's end date for a member to their lab end date. */
export const fixLockEndDate = (memberId) => Meteor.callAsync('lock.fix', memberId);
